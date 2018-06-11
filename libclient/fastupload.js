var socket;
var file;
var reader;
var started = 0;
var fastupload = {
	setinput: function (id) {
		document.getElementById(id).addEventListener('change', fastupload.selectfile);
	},
	selectfile: function (evnt){ file = evnt.target.files[0]; },
	upload: function (id){
	  if (started == 0) {
		if (document.getElementById(id).value != "") {
			/*var ext = file.name.split(".")[file.name.split(".").length-1]
			if (ext == "jpg"
				| ext == "png"
				| ext == "jpeg"
				| ext == "gif"
				| ext == "bmp"
				| ext == "tif"
				| ext == "tiff") {*/
				if (file.size < 2621440000) {
					var filepart;
					reader = new FileReader();
					reader.onload = function(evnt){
						socket.emit('Upload', { size: file.size, name : file.name, data : evnt.target.result });
					}
					filepart = file.slice(0, Math.min(262144, file.size));
					reader.readAsBinaryString(filepart);
					started = 1;
				} else {
					$("#uploadbar").empty();
					$("#uploadbar").append("<font color='red' size='3'>Ce fichier est trop gros</font>");
				}
			/*} else {
				$("#uploadmsg").empty();
				$("#uploadmsg").append("<font color='red' size='3'>Ce fichier n'est pas une image</font>");
			}*/
		} else {
			$("#uploadbar").empty();
			$("#uploadbar").append("<font color='red' size='5'>Aucun fichier choisi</font>");
		}
	  } else {
		  alert("Upload already started");
	  }
	},
	listen: function(server,id) {
	  socket = io.connect(server);
	  socket.on('repupload', function (data){
		if (data.type == "progress") {
			$("#uploadbar").empty();
			$("#uploadbar").append("<progress max='100' value='" + data.percent + "' form='form-id'>" + data.percent + "%</progress>");
			var filepart; //The Variable that will hold the new Block of Data
			filepart = file.slice(data.place, data.place + Math.min(262144, (file.size-data.place)));
			reader.readAsBinaryString(filepart);
		} else if (data.type == "finish") {
			$("#uploadbar").empty();
			$("#uploadbar").append("<font color='green' size='3'>image envoyé</font>");
			$("#" + id).val("");
			started = 0;
		} else if (data.type == 'refused') {
			$("#uploadbar").empty();
			$("#uploadbar").append("<font color='red' size='3'>" + data.raison + "</font>");
			$("#" + id).val("");
			started = 0;
		}
	  });
	},
	setupload: function (server,id) {
		fastupload.setinput(id);
		fastupload.listen(server,id);
	}
}
