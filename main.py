import asyncio
import base64
import json
from typing import List

from fastapi import FastAPI, UploadFile, File, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from hypercorn.asyncio import serve
from hypercorn.config import Config
from starlette.responses import PlainTextResponse
from starlette.staticfiles import StaticFiles

import logic.generate
import logic.structure
import logic.util

app = FastAPI()
app.mount("/static", StaticFiles(directory="static"), name="static")

origins = [
    'http://localhost',
    'http://localhost:8000',
    'localhost:8000',
    'localhost'
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*']
)


# List all bounding boxes for a given pdf document
@app.post("/util/bboxes")
async def list_bboxes(file: UploadFile = File(...)):
    filebytes = await file.read()
    return logic.util.bboxes(filebytes, file.filename)


# create structure from files and json and export pdf
@app.post("/create")
async def export_pdf(response: Response, files: List[UploadFile] = [], json: str = None):
    response.headers['Content-Disposition'] = 'attachment'
    files_bytes = {file.name: await file.read() for file in files}
    doc = logic.structure.Doc(json_conf=json, files=files_bytes)
    gen = logic.generate.Generator()
    return doc.export(gen)


@app.post("/generate")
async def generate_pdf(info: Request):
    j = await info.json()
    doc = logic.structure.Doc(json_conf=j)
    gen = logic.generate.Generator()
    return Response(content=doc.export(gen), media_type='application/pdf',
                    headers={'Content-Disposition': 'attachment'})


@app.post("/b64pdf", response_class=PlainTextResponse)
async def convert_pdf(req: Request, file: UploadFile = File(...)):
    filebytes = await file.read()
    result = base64.b64encode(filebytes).decode()
    return result


if __name__ == "__main__":
    config = Config()
    config.bind = ['localhost:8000']
    asyncio.run(serve(app, config))
