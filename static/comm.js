$('#load_bboxes').on('click', function() {
    var file_data = $('#source_file').prop('files')[0];
    var form_data = new FormData();
    form_data.append('file', file_data);
    $.ajax({
        url: '/util/bboxes',
        dataType: 'json',
        cache: false,
        contentType: false,
        processData: false,
        data: form_data,
        type: 'post',
        success: function(response) {
            console.log(response);
            for (page in response)
                for (box in response[page]) {
                    let pno = parseInt(page);
                    data.boxes.push(new ClipSrc({
                        doc: file_data.name,
                        pno: pno,
                        box: response[page][box]
                    }));
                }
            drawBoxes(data.pdf.pageNum - 1);
        }
    });
});

$('#preset').on('click', function() {
    var reader = new FileReader();
    reader.onload = function(e) {
        var data = JSON.parse(e.target.result);
        document_info = data;
    };
});