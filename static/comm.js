async function postData(url = "", data = {}) {
    // Default options are marked with *
    const response = await fetch(url, {
        method: "POST", // *GET, POST, PUT, DELETE, etc.
        mode: "cors", // no-cors, *cors, same-origin
        cache: "no-cache", // *default, no-cache, reload, force-cache, only-if-cached
        credentials: "same-origin", // include, *same-origin, omit
        headers: {
            "Content-Type": "application/json",
            // 'Content-Type': 'application/x-www-form-urlencoded',
            Accept: "application/pdf",
        },
        redirect: "follow", // manual, *follow, error
        referrer: "no-referrer", // no-referrer, *client
        body: JSON.stringify(data), // body data type must match "Content-Type" header
    });
    return await response; // parses JSON response into native JavaScript objects
}

function load_bboxes() {
    var file_data = $("#source_file").prop("files")[0];
    var form_data = new FormData();
    form_data.append("file", file_data);
    $.ajax({
        url: "/util/bboxes",
        dataType: "json",
        cache: false,
        contentType: false,
        processData: false,
        data: form_data,
        type: "post",
        success: function(response) {
            // push all the bboxes into the data.bboxes array to store them as source data
            for (page in response)
                for (box in response[page]) {
                    let pno = parseInt(page);
                    data.boxes.push(
                        new ClipSrc({
                            doc: data.pdfname,
                            pno: pno,
                            box: response[page][box],
                        })
                    );
                }
            drawBoxes(data.pdf.pageNum - 1);
        },
    });
}


function fetch_preset() {
    let promise = fetch("vorlage.json")
        .then((response) => response.json())
        .then((json) => {
            // set the preset
            data.doc = new Doc(json);

            // reset the part options
            document.getElementById("select_part").replaceChildren();
            data.doc.info.parts.forEach((part, i) => {
                let option = document.createElement("option");
                option.value = i;
                option.innerText = part.name;
                document.getElementById("select_part").appendChild(option);
            });


            // create fields for the replacements
            let repl_container = document.getElementById("repl_container");
            repl_container.replaceChildren();
            Object.entries(data.doc.info.replaced).forEach((repl, i) => {
                let name = repl[0],
                    value = repl[1];
                let input = new_text_field("repl_" + i, name, value, name, (ev) => { data.doc.info.replaced[name] = ev.target.value; });
                repl_container.appendChild(input);
            });
        });
}

function generate_pdf() {
    postData("/generate", JSON.stringify(data.doc))
        .then((res) => res.blob())
        .then((blob) => {
            // open PDF in PoP-Up (maybe use a download link instead)
            var newBlob = new Blob([blob], { type: "application/pdf" });
            var file = window.URL.createObjectURL(newBlob);
            window.open(file);
        })
        .catch((err) => console.log(err));
}



$("#load_bboxes").on("click", load_bboxes);
document.getElementById("preset").addEventListener("click", fetch_preset);
document.getElementById("generate_button").addEventListener("click", generate_pdf);