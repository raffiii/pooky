var pdfjsLib = window["pdfjs-dist/build/pdf"];

// The workerSrc property shall be specified.
pdfjsLib.GlobalWorkerOptions.workerSrc =
    "//mozilla.github.io/pdf.js/build/pdf.worker.js";

var data = {
    pdf: {
        doc: null,
        pageNum: 1,
        scale: 0.8
    },
    pdfname: "",
    rendering: {
        page: false,
        pageNumPending: null,
        canvas: document.getElementById("the-canvas"),
        ctx: document.getElementById("the-canvas").getContext("2d"),
    },
    overlay: {
        start: {},
        container: document.getElementById("container"),
        active_box: null,
        active_boxes: [],
        overlay: document.getElementById("overlay"),
    },
    preview: {
        preview: document.getElementById("preview"),
        previewCtx: document.getElementById("preview").getContext("2d"),
    },
    doc: new Doc({}),
    interactions: {
        select: document.getElementById("select_origin_mode"),
        part: document.getElementById('select_part')
    },
    get boxes() {
        return this.doc.info.clips;
    },
    set boxes(value) {
        this.doc.info.clips = value;
    }
}
console.log(data);

function renderPage(num) {
    data.rendering.page = true;
    // Using promise to fetch the page
    data.pdf.doc.getPage(num).then(function(page) {
        var viewport = page.getViewport({ scale: 1 });
        data.pdf.scale = (document.body.clientWidth / viewport.width) * 0.48;
        viewport = page.getViewport({ scale: data.pdf.scale });
        data.rendering.canvas.height = viewport.height;
        data.rendering.canvas.width = viewport.width;
        data.overlay.overlay.height = viewport.height;
        data.overlay.overlay.width = viewport.width;
        data.preview.preview.height = viewport.height;
        data.preview.preview.width = viewport.width;

        // Render PDF page into canvas context
        var renderContext = {
            canvasContext: data.rendering.ctx,
            viewport: viewport
        };
        var renderTask = page.render(renderContext);

        renderTask.promise.then(function() {
            data.rendering.page = false;
            if (data.rendering.pageNumPending !== null) {
                renderPage(data.rendering.pageNumPending);
                data.rendering.pageNumPending = null;
            }
            drawBoxes(data.pdf.pageNum - 1);
        });
    });

    document.getElementById("page_num").textContent = num;
}

function queueRenderPage(num) {
    if (data.rendering.page) {
        data.rendering.pageNumPending = num;
    } else {
        renderPage(num);
    }
}

function onPrevPage() {
    if (data.pdf.pageNum <= 1) {
        return;
    }
    data.pdf.pageNum--;
    queueRenderPage(data.pdf.pageNum);
}
document.getElementById("prev").addEventListener("click", onPrevPage);

function onNextPage() {
    if (data.pdf.pageNum >= data.pdf.doc.numPages) {
        return;
    }
    data.pdf.pageNum++;
    queueRenderPage(data.pdf.pageNum);
}
document.getElementById("next").addEventListener("click", onNextPage);

$('#source_file').on('change', function(e) {
    var file = e.target.files[0];
    if (file == undefined) {
        return;
    }
    var fileReader = new FileReader();

    fileReader.onload = function(e) {
        var buffer = e.target.result;
        var uint8Array = new Uint8Array(buffer);
        pdfjsLib.getDocument(uint8Array).promise.then(function(pdfDoc_) {
            data.pdf.doc = pdfDoc_;
            data.pdfname = pdfDoc_.fingerprints[0] + ".pdf";
            data.doc.files[data.pdfname] = window.btoa(uint8Array);
            $("#page_count").html(data.pdf.doc.numPages);

            let fd = new FormData();
            fd.append("file", file);

            $.ajax({
                url: '/b64pdf',
                dataType: 'text',
                cache: false,
                contentType: false,
                processData: false,
                data: fd,
                type: 'post',
                success: function(response) {
                    console.log(response);
                    data.doc.files[data.pdfname] = response;
                },
                error: function(error) {
                    console.log(error);
                }
            }); //*/
            /*fetch("/b64pdf", {
                    method: "POST",
                    mode: "cors",
                    headers: {
                        "Content-Type": "multipart/form-data",
                    },
                    body: fd,
                })
                .then((response) => response.json())
                .then((json) => { data.doc.files[data.pdfname] = json[0]; })
                .catch((error) => { console.log(error); });
            // */
            // Initial/first page rendering
            renderPage(data.pdf.pageNum);
        });
    };

    fileReader.readAsArrayBuffer(file);
});