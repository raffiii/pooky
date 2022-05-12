import json
from os.path import abspath, splitext
from typing import Union, Tuple, List, Dict, Optional
from zipfile import ZipFile, ZIP_DEFLATED

import fitz

from logic.util import JSONable
from logic.util import Box, Color, Placing, Size, Point


class FileType:
    PIX_IMAGE = "i"
    PDF = "p"
    VEC_IMAGE = "s"
    FONT = "f"

    @classmethod
    def get_from_extension(cls, path):
        _, e = splitext(path)
        if e in [".pdf"]:
            return cls.PDF
        elif e in [".ttf"]:
            return cls.FONT
        elif e in [".jpg", ".jpeg", ".png", ".bmp", ".gif"]:
            return cls.PIX_IMAGE
        elif e in [".svg"]:
            print("SVG Images may cause trouble!")
            return cls.VEC_IMAGE
        else:
            raise AttributeError("No compatible type")


class DisplayElement(JSONable):
    box: Placing

    def insert(self, **_):
        pass


class Erase(DisplayElement):
    box: Box
    color: Color

    def insert(self, g, **_):
        return g.insert_erase(self, **_)


class ClipSrc(JSONable):
    doc: str
    pno: int
    box: Box
    erase: List[Erase]


class ClipDst(DisplayElement):
    src: ClipSrc
    box: Placing

    def insert(self, g, **_):
        return g.insert_clip(self, **_)


class Image(DisplayElement):
    # Unused, untested
    src: str
    box: Box

    def insert(self, g, **_):
        return g.insert_image(self, **_)


class Text(DisplayElement):
    box: Box
    text: str = ""
    font: str = ""
    size: int = 0
    color: Color
    align: int = fitz.TEXT_ALIGN_LEFT
    # replacements: position in text with content hint
    insertions: List[Tuple[int, str]] = {}

    def insert(self, g, **_):
        return g.insert_text(self, **_)


class Line(DisplayElement):
    p: Point
    q: Point

    def insert(self, g, **_):
        return g.insert_line(self, **_)


class Font(JSONable):
    name: str
    filename: str


class Page(JSONable):
    template: List[DisplayElement]
    inner: Box
    content: List[DisplayElement]

    def insert(self, g, **_):
        return g.insert_page(self, **_)


class Part(JSONable):
    page: Page
    first: Page
    content_pages: List[Page]
    name: str

    def insert(self, g, **_):
        return g.insert_part(self, **_)


class Info(JSONable):
    parts: List[Part]
    fonts: Dict[str, Font]
    # Map replacement hints to actual text
    replaced: Dict[str, str]
    clips: Dict[str, List[ClipSrc]]

    def insert(self, g, **_):
        return g.insert_info(self, **_)


class Doc:
    info: Info
    files: Dict[str, bytes]

    def __init__(self, path=None, json_conf: str = None, files: Dict[str, bytes] = None):
        self.files = files if files is not None else {}
        # Create new Info
        if json_conf is not None:
            conf = json.loads(json_conf)
            self.info = Info(**conf)
        elif path is None:
            self.info = Info()
        # Load Info from Zipfile
        else:
            z = ZipFile(path)
            conf = None
            with z.open("info.json") as f:
                conf = json.loads(f.read())
            self.info = Info(**conf)
            # Import all referenced files
            for name in z.namelist():
                if name != "info.json":
                    with z.open(name, "r") as f:
                        self.files[name] = f.read()

    def get_added_boxes(self, doc_name, pno):
        if doc_name in self.info.clips and pno in self.info.clips[doc_name]:
            return [ob.box for ob in self.info.clips[doc_name][pno]]
        return []

    def addFile(self, path: str, ft: str):
        _, ext = splitext(path)
        h = ft + str(hash(abspath(path))) + ext
        if not h in self.files:
            try:
                with open(path, "rb") as f:
                    self.files[h] = f.read()
                    self.info.clips[h] = {}
            except IOError:
                print("Error while opening file")
        return h

    def save(self, filename):
        conf = json.dumps(self.info.to_dict())
        with ZipFile(
                filename, mode="w", compression=ZIP_DEFLATED, compresslevel=6
        ) as z:
            for name, file in self.files.items():
                z.writestr(name, file)
            z.writestr("info.json", conf)

    def create_pdf(self):
        return self.info.insert(self.files)

    def export(self, filename: str = None):
        d = self.create_pdf()
        if filename is None:
            return d.tobytes(defate=True, garbage=4, clean=True, deflate_images=True, deflate_fonts=True, linear=True)
        else:
            d.save(
                filename,
                deflate=True,
                garbage=4,
                clean=True,
                deflate_images=True,
                deflate_fonts=True,
                linear=True,
            )


def hook(d):
    cls = {c.mro()[0].__name__: c for c in [ClipSrc, ClipDst, Erase, Line, Image, Text, Font, Page, Part, Info, Doc]}
    if '__name__' in d and d['__name__'] in cls:
        return cls[d['__name__']](**d)
    return d


def from_json(j):
    return json.loads(j, object_hook=hook)
