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



function drawBoxes(pno) {
    var boxes = data.boxes.filter(b => b.pno == pno);
    var ctx = data.overlay.overlay.getContext('2d');
    //ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = 2;
    ctx.strokeStyle = "blue";

    console.log("drawing boxes")
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
        doc: file_data.name,
        pno: data.pdf.pageNum - 1,
        box: box
    }));
    drawBoxes(data.pdf.pageNum - 1);
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

    drawBoxes(data.pdf.pageNum - 1);
}

$('#container, #container *').on('mousedown', function(e) {
    data.boxes.start = getOverlayCoords(e);
}).on('mouseup', function(e) {
    if (data.interactions.select.value == "create") {
        endCreateBox(e);
    } else if (data.interactions.select.value == "delete") {
        endDeleteBox(e);
    }
});