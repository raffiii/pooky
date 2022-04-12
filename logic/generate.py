from typing import Union, Tuple, List, Dict, Callable
from zipfile import ZipFile, ZIP_DEFLATED
from os.path import abspath, splitext
import json
import fitz as fz
import datetime

import logic.structure as structure

(Box, Size, Point, Color, Placing, FileType) = (
    structure.Box, structure.Size, structure.Point, structure.Color, structure.Placing, structure.FileType)


def find_box(element, dst_box, box=None):
    if not box:
        box = element.box
    if len(box) < 4:
        box = dst_box[:2] + box
    return box[:4]


def insert_erase(erase, page: fz.Page, **kwargs):
    page.draw_rect(erase.box, fill=erase.color)


def insert_clip(self, page: fz.Page, dst_box: Box, docs: List[fz.Document], **kwargs):
    try:
        page.show_pdf_page(
            find_box(dst_box),
            docs[self.src.doc],
            pno=self.src.pno,
            clip=self.src.box,
        )
    except ValueError:
        print("Could not insert pdf at" + repr(dst_box))
        return
    for erase in self.src.erase:
        erase.insert()


def insert_image(
        img,
        page: fz.Page,
        files: Dict[str, bytes],
        xrefs: Dict[str, int],
        documents: Dict[str, fz.Document],
        **_
):
    # Unused, untested
    box = img.box
    if img.src in xrefs:
        page.insert_image(box, xref=xrefs[img.src])
    elif img.src in documents:
        page.show_pdf_page(box, documents[img.src])
    elif img.src[0] == FileType.PIX_IMAGE:
        xref = page.insert_image(box, stream=files[img.src])
        xrefs[img.src] = xref
    elif img.src[0] == FileType.PDF:
        d = fz.open(filetype=img.src, stream=files[img.src])
        documents[img.src] = d
        page.show_pdf_page(box, d)
    elif img.src[0] == FileType().VEC_IMAGE:
        d = fz.open(filetype=img.src, stream=files[img.src])
        pdfbytes = d.convert_to_pdf()
        img_pdf = fz.open(filetype=img.src, stream=pdfbytes)
        documents[img.src] = img_pdf
        page.show_pdf_page(box, img_pdf)


def insert_text(
        txt,
        page: fz.Page,
        files: Dict[str, bytes],
        xrefs: Dict[str, int],
        replacements: Dict[str, str],
        **kwargs
):
    text = txt.text
    for i, insertion in txt.insertions.items():
        text = text[:i] + insertion + text[i:]
    page.insert_textbox(
        rect=find_box(txt, txt.box),
        buffer=txt.text,
        fontsize=txt.size,
        font=txt.font,
        align=txt.align,
        fill=txt.color,
    )


def insert_line(self, page: fz.Page, **kwargs):
    page.draw_line(self.p, self.q)


def insert_page(
        self,
        page: fz.Page,
        files: Dict[str, bytes],
        xrefs: Dict[str, int],
        documents: Dict[str, fz.Document],
        replacements: Dict[str, str],
):
    for element in self.template:
        element.insert()
    for t in self.txt:
        insert_text(t, page, files, xrefs, replacements)
    for i in self.img:
        insert_image(i, page, files, xrefs, documents)
    for x, y, a, b in self.lines:
        page.draw_line((x, y), (a, b))
    return self.inner_box


def insert_part(
        self,
        new_page: Callable[[], fz.Page],
        files: Dict[str, bytes],
        xrefs: Dict[str, int],
        documents: Dict[str, fz.Document],
        replacements: Dict[str, str],
):
    if len(self.embeds) > 0:
        p, box = new_page()
        box = PageTemplate.to(self.header).insert(
            p, files, xrefs, documents, replacements
        )
        top = box[:]
        for group in self.embeds:
            group_length = 0
            for e in group:
                group_length += e.origin.box[3] + e.origin.box[1]
            if group_length > box[3] - box[1]:
                p, box = new_page()
            for e in group:
                x, y, a, b = e.origin.box
                w, h = a - x, b - y
                x, y, a, b = box
                EmbedBox.to(e).insert(p, (x, y, x + w, y + h), documents)
                box = (x, y + h, a, b)


def insert_info(self, files: Dict[str, bytes]):
    docs = {
        n: fz.open(filetype=n, stream=f)
        for n, f in files.items()
        if n[0] == FileType.PDF
    }
    xrefs = {}
    d = fz.open()
    replacements = self.replacements | {
        "date": datetime.date.today().strftime("%d.%m.%y")
    }

    def new_page():
        p = d.new_page()
        PageTemplate.to(self.template).insert(
            p, files, xrefs, docs, replacements | {"pno": str(p.number + 1)}
        )
        return p, self.template.inner_box

    for chapter in self.chapters:
        Chapter.to(chapter).insert(new_page, files, xrefs, docs, replacements)
    return d


def get_box(dst: Placing, src: Box):
    if len(dst.box) == 4:
        return dst.box
    else:
        return dst[:2] + src[2:]


def shrink_box(box: Box, placed_box: Placing):
    return box if len(placed_box) >= 4 else (
        box[0],
        box[1] + placed_box[3] - placed_box[1],
        box[2],
        box[3]
    )


class Generator:
    """
    Generates a PDF file from a template.

    Visitor pattern to dynamically bind methods to elements.
    """

    def insert_erase(self, erase: structure.Erase, page: fz.Page, outer_box: Box, **_):
        page.draw_rect(erase.box)
        return shrink_box(outer_box, erase.box)

    def insert_clip(self, clip: structure.ClipDst, page: fz.Page, documents: Dict[str, fz.Document], outer_box: Box,files:Dict[str,bytes],
                    **_):
        box = get_box(clip.box, clip.src.box)
        if clip.src.doc not in documents:
            documents[clip.src.doc] = fz.open(filetype=clip.src.doc, stream=files[clip.src.doc])
        try:
            page.show_pdf_page(box, documents[clip.src.doc], pno=clip.src.pno,
                               clip=clip.src.box)
        except ValueError:
            print("Could not insert clip at", clip.box)
        for erase in clip.erases:
            erase.insert(g=self, page=page, documents=documents, **_)
        return shrink_box(outer_box, box)

    def insert_image(self, img: structure.Image, page: fz.Page, files: Dict[str, bytes], xrefs: Dict[str, int],
                     outer_box: Box,
                     **_):
        image = fz.open(stream=files[img.src], filetype=img.src)
        src_box = image[0].rect[:4]
        image.close()
        box = get_box(img.box, src_box)
        if img.src in xrefs:
            page.insert_image(box, xref=xrefs[img.src])
        else:
            xref = page.insert_image(box, stream=files[img.src], filetype=img.src)
            xrefs[img.src] = xref
        return shrink_box(outer_box, box)

    def insert_text(self, txt: structure.Text, page: fz.Page, replacements: Dict[str, str], outer_box: Box, **_):
        replacements = replacements | {"pno": str(page.number + 1)}
        replaced = [(i, replacements[hint]) for i, hint in txt.insertions]
        replaced = sorted(replaced, key=lambda x: x[0])
        text = txt.text
        for i, r in replaced:
            text = text[:i] + r + text[i + 1:]
        page.insert_textbox(rect=txt.box, buffer=text, fontsize=txt.size, font=txt.font, align=txt.align,
                            fill=txt.color)
        return shrink_box(outer_box, txt.box)

    def insert_line(self, line: structure.Line, page: fz.Page, outer_box: Box, **_):
        page.draw_line(line.p, line.q)
        return outer_box

    def insert_page(self, page_info: structure.Page, elements: List[structure.DisplayElement], **_):
        inner_box = page_info.inner
        for e in page_info.template + elements:
            inner_box = e.insert(g=self, outer_box=inner_box, **_)

    def insert_part(self, part: structure.Part, result: fz.Document, **_):
        pages = zip([part.first] + [part.page] * (len(part.content) - 1), part.content)
        for p, c in pages:
            page = result.new_page()
            page.insert(g=self, elements=c, pageinfo=p, page=page, **_)

    def insert_info(self, info: structure.Info, result: fz.Document, files: Dict[str,bytes], **_):
        for part in info.parts:
            part.insert(g=self, result=result, files=files, **_)