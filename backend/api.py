import cv2
from fastapi import APIRouter

from fastapi.responses import Response

import demo

router = APIRouter(prefix='/api')

import base64

@router.get('/demos')
def getDemos(player:str, map:str, round_type:str,side:str ):
    
    result = demo.heatmaps(player=player,map=map,round=round_type,side=side)

    img,sample,grenades = result['radar_heatmap'],result['sample'],result['grenades']

    success,encoded = cv2.imencode('.jpg',img)

    if not success:
        return {'error':'could not encode image'}

    b64_image = base64.b64encode(encoded.tobytes()).decode('utf-8')

    return {'heatmap': b64_image, 'sample': sample, 'grenades':grenades}

@router.get('/check')
def check():
    return {'message':'ok'}
