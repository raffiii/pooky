from typing import List, Dict

import fitz as fz

import logic.structure as structure

(Box, Size, Point, Color, Placing, FileType) = (
    structure.Box, structure.Size, structure.Point, structure.Color, structure.Placing, structure.FileType)


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

    def insert_clip(self, clip: structure.ClipDst, page: fz.Page, documents: Dict[str, fz.Document], outer_box: Box,
                    files: Dict[str, bytes],
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

    def insert_info(self, info: structure.Info, result: fz.Document, files: Dict[str, bytes], **_):
        for part in info.parts:
            part.insert(g=self, result=result, files=files, **_)
