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

function merge_overlapping_boxes(boxes) {
    let unchecked = boxes.slice();
    let merged = [];
    while (unchecked.length > 0) {
        let box = unchecked.pop();
        for (let j = 0; j < merged.length; j++) {
            let mbox = merged[j];
            if (overlaps(box, mbox)) {
                mbox.x0 = Math.min(mbox.x0, box.x0);
                mbox.y0 = Math.min(mbox.y0, box.y0);
                mbox.x1 = Math.max(mbox.x1, box.x1);
                mbox.y1 = Math.max(mbox.y1, box.y1);

                unchecked.push(mbox);
                merged.splice(j, 1);
            } else {
                merged.push(box);
            }
        }
    }
}


function drawBoxes(pno) {
    console.log("draw boxes", pno);
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

    console.log("delete box", box);
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

function appendBox(e) {
    let boxes = merge_overlapping_boxes(getContainedBoxes(e));
    boxes.forEach(b => {
        data.doc.info.parts[document.getElementById('select_part').value].insert_box(b);
    });
}

$('#container').on('mousedown', function(e) {
    data.overlay.start = getOverlayCoords(e);
}).on('mouseup', function(e) {
    if (data.interactions.select.value == "create") {
        endCreateBox(e);
    } else if (data.interactions.select.value == "delete") {
        endDeleteBox(e);
    } else if (data.interactions.select.value == "group") {
        endGroupBox(e);
    } else if (data.interactions.select.value == "add") {
        appendBox(e);
    }

    drawBoxes(data.pdf.pageNum - 1);
});

$('#container').on('click', function(e) {
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

$('#container').on('keypress', function(e) {
    let code = e.keyCode || e.which;
    if (data.overlay.active_box == null) return;
    if ('123456789'.includes(code)) {
        let i = int(code - '1'.charCodeAt(0));
        data.doc.info.parts[0].insert_box = data.overlay.active_box;
    }
});