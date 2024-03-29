function getCoords(elem) {
    var box = elem.getBoundingClientRect();

    var body = document.body;
    var docEl = document.documentElement;

    var scrollTop = window.pageYOffset || docEl.scrollTop || body.scrollTop;
    var scrollLeft = window.pageXOffset || docEl.scrollLeft || body.scrollLeft;

    var clientTop = docEl.clientTop || body.clientTop || 0;
    var clientLeft = docEl.clientLeft || body.clientLeft || 0;

    var top = box.top + scrollTop - clientTop;
    var left = box.left + scrollLeft - clientLeft;

    return { top: Math.round(top), left: Math.round(left) };
}

function getOverlayCoords(e) {
    let x = e.pageX;
    let y = e.pageY;
    let coords = getCoords(overlay);
    let scale = data.pdf.scale;
    return {
        x: (x - coords.left) / scale,
        y: (y - coords.top) / scale,
    };
}

function getContainedBoxes(e) {
    let coords = getOverlayCoords(e);
    var box = {
        x0: data.overlay.start.x,
        y0: data.overlay.start.y,
        x1: coords.x,
        y1: coords.y,
    };

    let boxes = data.boxes.filter(b => {
        return (b.pno == data.pdf.pageNum - 1 &&
            b.box.x0 >= box.x0 &&
            b.box.y0 >= box.y0 &&
            b.box.x1 <= box.x1 &&
            b.box.y1 <= box.y1);
    });
    return boxes;
}

function overlaps(b, c) {
    return !(b.x1 < c.x0 || b.x0 > c.x1 || b.y1 < c.y0 || b.y0 > c.y1);
}

function intersection(a, b) {
    if (!overlaps(a, b)) return null;
    return {
        x0: Math.max(a.x0, b.x0),
        x1: Math.min(a.x1, b.x1),
        y0: Math.max(a.y0, b.y0),
        y1: Math.min(a.y1, b.y1)
    }
}

function merge_overlapping_boxes(boxes) {
    let merged = boxes.slice();
    var overlapping = false;
    do {
        overlapping = false;
        for (var i = 0; i < merged.length; i++)
            for (var j = i + 1; j < merged.length; j++)
                if (overlaps(merged[i].box, merged[j].box)) {
                    // setup
                    let b = merged.pop(j);
                    let c = merged.pop(i);
                    j = i + 1;
                    overlapping = true;
                    // merge
                    let clip = Object.assign({}, c);
                    clip.box = {
                        x0: Math.min(c.box.x0, b.box.x0),
                        y0: Math.min(c.box.y0, b.box.y0),
                        x1: Math.max(c.box.x1, b.box.x1),
                        y1: Math.max(c.box.y1, b.box.y1)
                    }
                    // add back
                    merged.push(clip);
                }
    }
    while (overlapping);
    return merged;
}


function drawBoxes(pno) {
    let boxes = data.boxes.filter(b => b.doc == data.pdfname && b.pno == pno);
    let ctx = data.overlay.overlay.getContext('2d');
    let canvas = data.overlay.overlay;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = 2;
    ctx.strokeStyle = "blue";
    let scale = data.pdf.scale;
    for (var box of boxes) {
        var x = box.box.x0 * scale,
            y = box.box.y0 * scale,
            w = (box.box.x1 - box.box.x0) * scale,
            h = (box.box.y1 - box.box.y0) * scale;
        ctx.strokeRect(x, y, w, h);

    }

}

function drawBlockedRegions(pno, part_name = null) {
    let part = part_name || document.getElementById('select_part').value;
    let pages = data.doc.info.parts[part].content_pages;
    let inner = pages[pno].inner;
    let ctx = data.preview.preview.getContext('2d');
    let canvas = data.preview.preview;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = 2;
    ctx.fillStyle = "#BBFFB0";
    let scale = data.pdf.scale;
    let c = { ...inner.x0 };
    var x = c.x0 * scale,
        y = c.y0 * scale,
        w = (c.x1 - c.x0) * scale,
        h = (c.y1 - c.y0) * scale;
    ctx.fillRect(x, y, w, h);
    drawPlaced(part, pno);
}

function drawPlaced(part, pno) {
    let page = data.doc.info.parts[part].content_pages[pno];
    var inner = page.inner;
    let ctx = data.preview.preview.getContext('2d');
    let canvas = data.preview.preview;
    let bgCanvas = document.createElement('canvas');
    bgCanvas.width = canvas.width;
    bgCanvas.height = canvas.height;
    let bgCtx = bgCanvas.getContext('2d');

    let pnos = new Set(page.content.map(cd => cd.src.pno));


    function resolveBoxes(pnos) {
        pnos = [...pnos]
        let p = pnos.pop()
        return getBoxesOnPage(p, page.content, bgCtx).then(boxes => {
            boxes.forEach(b => {
                let x = b.clip.box.x0  * data.pdf.scale,
                    y = b.clip.box.y0  * data.pdf.scale;
                ctx.putImageData(b.img, x, y)
            });
            if (pnos.length > 0)
                resolveBoxes(pnos);
        });
    }
    resolveBoxes(pnos);
}

function getBoxesOnPage(pno, boxes, ctx) {
    return data.pdf.doc.getPage(pno + 1).then(async (page) => {
        let viewport = page.getViewport({ scale: data.pdf.scale });
        // Render PDF page into background canvas context
        var renderContext = {
            canvasContext: ctx,
            viewport: viewport
        };
        var renderTask = page.render(renderContext);

        return await renderTask.promise.then(() =>
            boxes.filter(b => b.src.pno == pno).filter(b =>
                b.src.box.x0 < b.src.box.x1 && b.src.box.y0 < b.src.box.y1
            ).map(b => {
                let scale = data.pdf.scale;
                let x = b.src.box.x0 * scale,
                    y = b.src.box.y0 * scale,
                    w = (b.src.box.x1 - b.src.box.x0) * scale,
                    h = (b.src.box.y1 - b.src.box.y0) * scale;
                return { img: ctx.getImageData(x, y, w, h), clip: b };
            })
        );
    });
}

function isIterable(obj) {
    // checks for null and undefined
    if (obj == null) {
        return false;
    }
    return typeof obj[Symbol.iterator] === 'function';
}


function removeLastBox() {
    let part = data.doc.info.parts[data.interactions.part.value];
    let page = part.content_pages[part.content_pages.length - 1];
    let last_element = page.content.pop();
    if (page.content.length == 0) {
        part.content_pages.pop();
    }
    else {

        page.inner.y0 -= last_element.box.y1 - last_element.box.y0;
    }
}

function endCreateBox(e) {
    let coords = getOverlayCoords(e);
    var box = {
        x0: data.overlay.start.x,
        y0: data.overlay.start.y,
        x1: coords.x,
        y1: coords.y,
    };

    data.boxes.push(new ClipSrc({
        doc: data.pdfname,
        pno: data.pdf.pageNum - 1,
        box: box
    }));
}

function endDeleteBox(e) {
    let coords = getOverlayCoords(e);
    var box = {
        x0: data.overlay.start.x,
        y0: data.overlay.start.y,
        x1: coords.x,
        y1: coords.y,
    };

    data.boxes = data.boxes.filter(b => {
        return b.pno != data.pdf.pageNum - 1 || !(
            b.box.x0 >= box.x0 &&
            b.box.y0 >= box.y0 &&
            b.box.x1 <= box.x1 &&
            b.box.y1 <= box.y1
        )
    });

}

function endGroupBox(e) {
    let old_boxes = getContainedBoxes(e);
    let new_box = old_boxes.reduce(
        (acc, b) => {
            return {
                x0: Math.min(acc.x0, b.box.x0),
                y0: Math.min(acc.y0, b.box.y0),
                x1: Math.max(acc.x1, b.box.x1),
                y1: Math.max(acc.y1, b.box.y1)
            }
        }, {
        x0: Infinity,
        y0: Infinity,
        x1: -Infinity,
        y1: -Infinity
    }
    )
    endDeleteBox(e);
    data.boxes.push(new ClipSrc({
        doc: data.pdfname,
        pno: data.pdf.pageNum - 1,
        box: new_box
    }));

}

function endTrimBoxes(e) {
    let coords = getOverlayCoords(e);
    var box = {
        x0: data.overlay.start.x,
        y0: data.overlay.start.y,
        x1: coords.x,
        y1: coords.y,
    };
    data.boxes = data.boxes.map(b => {
        if (b.pno == data.pdf.pageNum - 1) {
            c = new ClipSrc(b);
            c.box = intersection(box, b.box);
            return c;
        }
        return b;
    }).filter(b => b.box != null);
}

function appendBox(e) {
    let boxes = merge_overlapping_boxes(getContainedBoxes(e));
    boxes.forEach(b => {
        data.doc.info.parts[document.getElementById('select_part').value].insert_box(b);
    });
}

$('#container').on('mousedown', function (e) {
    data.overlay.start = getOverlayCoords(e);
}).on('mouseup', function (e) {
    switch (data.interactions.select.value) {
        case "create":
            endCreateBox(e);
            break;
        case "delete":
            endDeleteBox(e);
            break;
        case "group":
            endGroupBox(e);
            break;
        case "add":
            appendBox(e);
            let pno = data.doc.info.parts[document.getElementById('select_part').value].content_pages.length;
            drawBlockedRegions(pno - 1);
            break;
        case "trim":
            endTrimBoxes(e);
            break;
        default:
            break;
    }


    drawBoxes(data.pdf.pageNum - 1);
});

$('#container').on('click', function (e) {
    let coords = getOverlayCoords(e);
    let active_boxes = data.boxes.filter(b =>
        b.pno == data.pdf.pageNum - 1 &&
        b.box.x0 <= coords.x &&
        b.box.y0 <= coords.y &&
        b.box.x1 >= coords.x &&
        b.box.y1 >= coords.y
    );
    if (active_boxes != data.overlay.active_boxes) {
        data.overlay.active_boxes = active_boxes;
        data.overlay.active_box = active_boxes[0];
    } else {
        let i = data.overlay.active_boxes.indexOf(data.overlay.active_box);
        data.overlay.active_boxes = data.overlay.active_boxes[(i + 1) % data.overlay.active_boxes.length];
    }
    drawBoxes(data.pdf.pageNum - 1);
});

$('#container').on('keypress', function (e) {
    let code = e.keyCode || e.which;
    if (data.overlay.active_box == null) return;
    if ('123456789'.includes(code)) {
        let i = int(code - '1'.charCodeAt(0));
        data.doc.info.parts[0].insert_box = data.overlay.active_box;
    }
});