import inspect
import json
from typing import Tuple, List, Dict, Union

import fitz as fz

Box = Tuple[int, int, int, int]
Size = Tuple[int, int]
Point = Tuple[int, int]
Color = Tuple[float, float, float]
Placing = Union[Box, Size]


def list_origin_boxes(
        page: fz.Page,
        contentRect: fz.Rect = None,
):
    if contentRect == None:
        contentRect = page.bound()

    bboxes = [fz.Rect(block["bbox"]) for block in page.get_text("dict", clip=contentRect)['blocks']]
    bboxes += [draw["rect"] for draw in page.get_drawings()]

    return bboxes


def bboxes(filebytes: bytes, filename: str):
    doc = fz.open(stream=filebytes, filetype=filename.split('.')[-1])
    return {p.number: list_origin_boxes(p) for p in doc}


class DataDict:
    def to_dict(self):
        def dict_child(c):
            if isinstance(c, DataDict):
                return c.to_dict()
            elif isinstance(c, list):
                return [dict_child(cc) for cc in c]
            elif isinstance(c, dict):
                return {dict_child(k): dict_child(v) for k, v in c.items()}
            else:
                return c

        return {k: dict_child(v) for k, v in self.__dict__.items()} | {'__name__': self.__class__.__name__}


class JSONable(DataDict):
    def __init__(self, **kwargs):

        # set all given attrs, init other objects from dict
        if self.get_annotations() is None:
            return
        for k, t in self.get_annotations().items():
            if k in kwargs:
                setattr(self, k, kwargs[k])

    @classmethod
    def get_annotations(cls):
        d = {}
        for c in cls.mro():
            try:
                d.update(**c.__annotations__)
            except AttributeError:
                pass
        return d

