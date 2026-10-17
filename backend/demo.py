import datetime
import json
import os
import random
import uuid

import cv2
import numpy as np
from awpy import Demo
from pathlib import Path
import polars as pl

from bs4 import BeautifulSoup
import requests
from dateutil.relativedelta import relativedelta
from playwright.sync_api import sync_playwright
from playwright_stealth import Stealth

def clear_directory(directory):
    directory = Path(directory)

    for file in directory.iterdir():
        if file.is_file():
            file.unlink()


def makeDemoList():

    clear_directory('demo-list')
    clear_directory('parsed-demos')

    demo_list = []

    for file in Path('matches').iterdir():
        if file.is_file():
            demo_list.append(demoParse(file.name))


    metas = []

    for demo in demo_list:
        for data in demo:
            metas.append(data['meta'])
            data['ticks'].write_parquet(f'parsed-demos/{data["id"]}.parquet')
            data['grenades'].write_parquet(f'parsed-demos/{data["id"]}-grenades.parquet')

    pl.DataFrame(metas).write_parquet(f'demo-list/demos.parquet')

def demoParse(demo_path:str):
    demo = Demo(f'matches/{demo_path}')
    demo.parse(player_props=['yaw', 'pitch', 'balance', 'current_equip_value'], other_props=['equipment_value'])

    ticks = demo.ticks

    map = demo.header['map_name']

    grenades = demo.grenades
    projectiles = grenades.filter((pl.col('grenade_type').str.contains('Projectile')))
    
    grouped = ticks.group_by('round_num')

    rounds = demo.rounds.select(['round_num', 'freeze_end'])

    # 3. Join with your ticks to get only the ticks exactly at freeze_end
    freeze_ticks = demo.ticks.join(
        rounds,
        left_on=['round_num', 'tick'],
        right_on=['round_num', 'freeze_end'],
        how='inner'
    )
    # 4. Group by round and side to calculate the team's total equipment value
    team_equip = freeze_ticks.group_by(['round_num', 'side']).agg(
        pl.col('current_equip_value').sum().alias('team_equip_value')
    ).sort(['round_num', 'side'])
    # 5. (Optional) Categorize the round based on custom thresholds
    # e.g., < 5000 = Eco, 5000-15000 = Force, > 15000 = Full Buy
    sides = team_equip.with_columns(
        pl.when((pl.col('round_num') == 1) | (pl.col('round_num') == 13)).then(pl.lit('pistol'))
        .when(pl.col("team_equip_value") < 5000).then(pl.lit("eco"))
        .when(pl.col("team_equip_value") < 15000).then(pl.lit("force"))
        .otherwise(pl.lit("buy"))
        .alias("round_type")
    )

    results = []

    for name, group in grouped:

        group = group.filter((pl.col('tick') >= rounds.filter(pl.col('round_num') == name[0]).select('freeze_end').item() - 50))

        for player, g1 in group.group_by('name'):
            hex_id = uuid.uuid4().hex
            result = {'id': hex_id, 'name': player[0], 'side': g1['side'][0], 'map': map,
                      'round_type': sides.filter((pl.col('side') == g1['side'][0]) & (pl.col('round_num') == name[0]))[
                          'round_type'][0], 'round_num': name[0]}

            results.append({
                'meta': result, 
                'ticks': g1, 
                'id': hex_id, 
                'grenades':projectiles.filter((pl.col('thrower') == player[0]) & (pl.col('round_num') == name[0]))
                })

    return results

def getDemoList(map='',player='',side='',round=''):
    filtered = pl.read_parquet('demo-list/demos.parquet')
    filtered = filtered.filter((pl.col('map') == f'de_{map}') & (pl.col('name') == player) & (pl.col('side') == side) & (pl.col('round_type') == round))

    return [x['id'] for x in filtered.to_dicts()]

def heatmaps( map='anubis',player='donk',round='buy',side='t'):
    config = json.load(open('map_radar_scales.json'))['maps']['de_' + map]


    #GETTING IDS FOR CORRESPONDING DEMOS

    ids = getDemoList(map=map,player=player,round=round,side=side)


    #GETTING RADAR HEATMAP FOR THE DEMOS

    radar = cv2.imread(f'radars/{map}.png')
    mask = np.zeros_like(radar, dtype=np.uint8)

    POS_X = config['pos_x']
    POS_Y = config['pos_y']
    SCALE = config['scale']

    folder = Path('parsed-demos')

    for id in ids:
        file = folder / f'{id}.parquet'

        if Path(file).is_file():
            for tick in pl.read_parquet(file).to_dicts():
                if tick['health'] == 0:
                    break
                x = int((tick['X'] - POS_X) / SCALE)
                y = int(-(tick['Y'] - POS_Y) / SCALE)

                mask[y][x] += 10

    mask = cv2.GaussianBlur(mask, (51, 51), 10)

    normalized = cv2.normalize(
        mask,
        None,
        0,
        255,
        cv2.NORM_MINMAX
    ).astype(np.uint8)

    colored = cv2.applyColorMap(normalized, cv2.COLORMAP_JET)

    # Remove very low-intensity areas
    colored[normalized < 40] = 0

    radar = cv2.addWeighted(radar, 0.5, colored, 0.5, 0)

    # GETTING SAMPLE ROUND

    sample_id = random.choice(ids)

    sample_demo = pl.read_parquet(f'parsed-demos/{sample_id}.parquet')
    grenades = pl.read_parquet(f'parsed-demos/{sample_id}-grenades.parquet')

    sample_demo = sample_demo.filter(~(pl.col('health') == 0))


    return {'radar_heatmap':radar,'sample':sample_demo.to_dicts(),'grenades':grenades.to_dicts()}


# DOES NOT WORK
def downloadDemos(months:int=12):

    today = datetime.datetime.today().strftime('%Y-%m-%d')
    startDate = (datetime.date.today() - relativedelta(months=months)).strftime("%Y-%m-%d")

    url = f'https://www.hltv.org/results?offset=0&startDate={startDate}&endDate={today}'

    def get_page(url):
        with sync_playwright() as p:
            browser = p.chromium.launch()
            page = browser.new_page()

            page.goto(url, wait_until="domcontentloaded", timeout=0)

            page.wait_for_timeout(5000)

            html = page.content()

            browser.close()

            return html

    html = get_page(
        url
    )

    matches = BeautifulSoup(html, 'html.parser')

    print(matches.prettify())

    headlines = matches.find_all(class_='result-con')

    for headline in headlines:
        print(headline.text)




def main():
    makeDemoList()


if __name__ == '__main__':
    main()
