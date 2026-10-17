from fastapi import FastAPI
from api import router
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

# Mount radars directory for static serving
radars_path = os.path.join(os.path.dirname(__file__), "radars")
if os.path.exists(radars_path):
    app.mount("/radars", StaticFiles(directory=radars_path), name="radars")

# Mount frontend build
dist_path = os.path.join(os.path.dirname(__file__), "..", "frontend", "demo-viewer-frontend", "dist")
if os.path.exists(dist_path):
    app.mount("/", StaticFiles(directory=dist_path, html=True), name="frontend")
else:
    @app.get('/')
    def home():
        return {'message':'Hello World. Frontend not built.'}
