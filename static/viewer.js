// If absolute URL from the remote server is provided, configure the CORS
// header on that server.
var url =
    "https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf";

// Loaded via <script> tag, create shortcut to access PDF.js exports.
var pdfjsLib = window["pdfjs-dist/build/pdf"];

// The workerSrc property shall be specified.
pdfjsLib.GlobalWorkerOptions.workerSrc =
    "//mozilla.github.io/pdf.js/build/pdf.worker.js";

var pdfDoc = null,
    pageNum = 1,
    pageRendering = false,
    pageNumPending = null,
    scale = 0.8,
    canvas = document.getElementById("the-canvas"),
    overlay = document.getElementById("overlay"),
    preview = document.getElementById("preview"),
    ctx = canvas.getContext("2d"),
    overlayCtx = overlay.getContext("2d"),
    previewCtx = preview.getContext("2d"),
    boxes = {},
    doc = {};

function boxes() {
    return doc.info.clips;
}

function drawBoxes(pno) {
    var ctx = overlay.getContext("2d");
    ctx.clearRect(0, 0, overlay.width, overlay.height);
    for (var box of boxes()[pno]) {
        ctx.beginPath();
        ctx.strokeStyle = "red";
        var x = box.x0,
            y = box.y0,
            w = box.x1 - box.x0,
            h = box.y1 - box.y0;
        ctx.rect(x * scale, y * scale, w * scale, h * scale);
        ctx.closePath();
        ctx.stroke();
    }
}

/**
 * Get page info from document, resize canvas accordingly, and render page.
 * @param num Page number.
 */
function renderPage(num) {
    pageRendering = true;
    // Using promise to fetch the page
    pdfDoc.getPage(num).then(function(page) {
        var viewport = page.getViewport({ scale: 1 });
        scale = (document.body.clientWidth / viewport.width) * 0.48;
        viewport = page.getViewport({ scale: scale });
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        overlay.height = viewport.height;
        overlay.width = viewport.width;
        preview.height = viewport.height;
        preview.width = viewport.width;

        // Render PDF page into canvas context
        var renderContext = {
            canvasContext: ctx,
            viewport: viewport,
        };
        var renderTask = page.render(renderContext);

        // Wait for rendering to finish
        renderTask.promise.then(function() {
            pageRendering = false;
            if (pageNumPending !== null) {
                // New page rendering is pending
                renderPage(pageNumPending);
                pageNumPending = null;
            }
            drawBoxes(pageNum - 1);
        });
    });

    // Update page counters
    document.getElementById("page_num").textContent = num;
}

/**
 * If another page rendering in progress, waits until the rendering is
 * finished. Otherwise, executes rendering immediately.
 */
function queueRenderPage(num) {
    if (pageRendering) {
        pageNumPending = num;
    } else {
        renderPage(num);
    }
}

/**
 * Displays previous page.
 */
function onPrevPage() {
    if (pageNum <= 1) {
        return;
    }
    pageNum--;
    queueRenderPage(pageNum);
}
document.getElementById("prev").addEventListener("click", onPrevPage);

/**
 * Displays next page.
 */
function onNextPage() {
    if (pageNum >= pdfDoc.numPages) {
        return;
    }
    pageNum++;
    queueRenderPage(pageNum);
}
document.getElementById("next").addEventListener("click", onNextPage);

/**
 * Asynchronously downloads PDF.
 */
$("#source_file").on("change", function(e) {
    var file = e.target.files[0];
    if (file == undefined) {
        return;
    }
    var fileReader = new FileReader();

    fileReader.onload = function(e) {
        var buffer = e.target.result;
        var uint8Array = new Uint8Array(buffer);
        pdfjsLib.getDocument(uint8Array).promise.then(function(pdfDoc_) {
            pdfDoc = pdfDoc_;
            $("#page_count").html(pdfDoc.numPages);

            // Initial/first page rendering
            renderPage(pageNum);
        });
    };

    fileReader.readAsArrayBuffer(file);
});


$("#load_bboxes").on("click", function() {
    var file_data = $("#source_file").prop("files")[0];
    var form_data = new FormData();
    form_data.append("file", file_data);
    $.ajax({
        url: "/util/bboxes", // <-- point to server-side PHP script
        dataType: "json", // <-- what to expect back from the PHP script, if anything
        cache: false,
        contentType: false,
        processData: false,
        data: form_data,
        type: "post",
        success: function(bboxes) {
            boxes() = bboxes;
            drawBoxes(pageNum - 1);
        },
    });
});

var start = {};

function getCoords(elem) {
    // crossbrowser version
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

let get_overlay_coords = function(e) {
    let x = e.pageX;
    let y = e.pageY;
    let coords = getCoords(overlay);
    return {
        x: (x - coords.left) / scale,
        y: (y - coords.top) / scale,
    };
};

let end_create_box = function(e) {
    let coords = get_overlay_coords(e);
    var box = {
        x0: start.x,
        y0: start.y,
        x1: coords.x,
        y1: coords.y,
    };
    boxes[pageNum - 1].push(box);
    drawBoxes(pageNum - 1);
};

let end_delete_box = function(e) {
    let coords = get_overlay_coords(e);
    var box = {
        x0: start.x,
        y0: start.y,
        x1: coords.x,
        y1: coords.y,
    };
    boxes[pageNum - 1] = boxes[pageNum - 1].filter(function(b) {
        return !(
            b.x0 >= box.x0 &&
            b.y0 >= box.y0 &&
            b.x1 <= box.x1 &&
            b.y1 <= box.y1
        );
    });
    drawBoxes(pageNum - 1);
};

let select = document.getElementById("select_origin_mode");

overlay.addEventListener("mousedown", function(e) {
    start = get_overlay_coords(e);
});

overlay.addEventListener("mouseup", function(e) {
    if (select.value == "create") {
        end_create_box(e);
    } else if (select.value == "delete") {
        end_delete_box(e);
    }
});

let container = document.getElementById("container");
var active_box = null;
container.addEventListener("click", function(e) {
    var x = e.offsetX,
        y = e.offsetY;
    var page = pageNum - 1;
    active_box = boxes[page].find(function(b) {
        return x > b.x0 && x < b.x1 && y > b.y0 && y < b.y1;
    });
});

container.addEventListener("blur", function(e) {
    if (container.contains(document.activeElement)) {
        return;
    }
    active_box = null;
});

$("#container > *").on("focus", function(e) {
    $("#container").focus();
});

document.getElementById("preset").addEventListener("change", function(e) {
    var reader = new FileReader();
    reader.onload = function(e) {
        var data = JSON.parse(e.target.result);
        document_info = data;
    };
});