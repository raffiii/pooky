import inspect
from typing import Tuple, List, Dict

import fitz as fz


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

        return {k: dict_child(v) for k, v in self.__dict__.items()}


class JSONable(DataDict):
    def __init__(self, **kwargs):
        # convert nested JSONable objects to their classes
        def convert(typehint, arg):
            if JSONable in typehint.mro():
                if isinstance(arg, typehint):
                    return arg
                return typehint.of_dict(**arg)
            if typehint is List or typehint is list:
                return [convert(typehint.__args__[0], a) for a in arg]
            if typehint is Dict or typehint is dict:
                return {k: convert(typehint[1], v) for k, v in arg.items()}
            if typehint is Tuple or typehint is tuple:
                length = len(typehint.__args__)
                arg = arg + len(typehint.__args__) * [None]
                return tuple(
                    convert(typehint.__args__[i], a) for i, a in enumerate(arg)
                )[:length]
            return arg

        # set all given attrs, init other objects from dict
        for k, t in self.get_annotations().items():
            if k in kwargs:
                setattr(self, k, convert(t, kwargs[k]))

    @classmethod
    def get_annotations(cls):
        d = {}
        for c in cls.mro():
            try:
                d.update(**c.__annotations__)
            except AttributeError:
                pass

    @classmethod
    def of_dict(cls, **kwargs):
        self = cls.__new__(cls)
        super(JSONable, self).__init__(**kwargs)
        params = inspect.signature(self.__init__).parameters.keys()
        params = {k: kwargs[k] for k in params if k != "self" and k in params}
        self.__init__(**params)
        return self


