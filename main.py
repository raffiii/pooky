from typing import List

from fastapi import FastAPI, UploadFile, File
from starlette.staticfiles import StaticFiles

import logic.util
import logic.structure

app = FastAPI()
app.mount("/static", StaticFiles(directory="static"), name="static")

# List all bounding boxes for a given pdf document
@app.post("/util/bboxes")
async def list_bboxes(file: UploadFile = File(...)):
    filebytes = await file.read()
    return logic.util.bboxes(filebytes, file.filename)

# create structure from files and json and export pdf
@app.post("/create")
async def export_pdf(files: List[UploadFile] = None, json: str = None):
    files_bytes = {file.name: await file.read() for file in files}
    doc = logic.structure.Doc(json_conf=json,files=files_bytes)
    return doc.export()