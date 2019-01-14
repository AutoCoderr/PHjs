var files = {};
var sockets = {};
var readers = {};
var starteds = {};
var fastupload = {
	setinput: function () {
		if (typeof(this.id) == "undefined") {
			alert("setinput : 'id' variable not defined");
			return;
		}
		document.getElementById(this.id).addEventListener('change',  this.selectfile);
	},
	selectfile: function (evnt){ 
		files[this.id + "-p"] = evnt.target.files[0]; 
	},
	upload: function (){
	  if (starteds[this.id] == 0) {
		if (document.getElementById(this.id).value != "") {
			/*var ext = file.name.split(".")[file.name.split(".").length-1]
			if (ext == "jpg"
				| ext == "png"
				| ext == "jpeg"
				| ext == "gif"
				| ext == "bmp"
				| ext == "tif"
				| ext == "tiff") {*/
				//if (files[this.id + "-p"].size < 2621440000) {
					files[this.id] = files[this.id + "-p"];
					delete files[this.id + "-p"];
					this.filepart = files[this.id].slice(0, Math.min(262144, files.size));
					readers[this.id].readAsBinaryString(this.filepart);
					starteds[this.id] = 1;
				/*} else {
					$("#uploadbar-" + this.id).empty();
					$("#uploadbar-" + this.id).append("<font color='red' size='3'>This file is too big!</font>");
				}
			} else {
				$("#uploadmsg").empty();
				$("#uploadmsg").append("<font color='red' size='3'>Ce fichier n'est pas une image</font>");
			}*/
		} else {
			$("#uploadbar-" + this.id).empty();
			$("#uploadbar-" + this.id).append("<font color='red' size='3'>No file chosen</font>");
		}
	  } else {
		  alert("Upload already started");
	  }
	},
	listen: function() {
	  if (typeof(this.id) == "undefined") {
			alert("listen : 'id' variable not defined");
			return;
	  }
	  if (typeof(this.server) == "undefined") {
			alert("listen : 'server' variable not defined");
			return;
	  }
	  readers[this.id] = new FileReader();
	  readers[this.id].id = this.id;
	  readers[this.id].onload = function(evnt){
			sockets[this.id].emit('Upload', { size: files[this.id].size, name : files[this.id].name, data : evnt.target.result });
	  }
	  sockets[this.id] = io.connect(this.server);
	  sockets[this.id].idb = this.id;
	  sockets[this.id].on('repupload', function (data){
		if (data.type == "progress") {
			$("#uploadbar-" + this.idb).empty();
			$("#uploadbar-" + this.idb).append("<progress max='100' value='" + data.percent + "' form='form-id'>" + data.percent + "%</progress>");
			this.filepart = files[this.idb].slice(data.place, data.place + Math.min(262144, (files[this.idb].size-data.place)));
			readers[this.idb].readAsBinaryString(this.filepart);
		} else if (data.type == "finish") {
			$("#uploadbar-" + this.idb).empty();
			$("#uploadbar-"+ this.idb).append("<font color='green' size='3'>File uploaded!</font>");
			$("#" + this.idb).val("");
			starteds[this.idb] = 0;
		} else if (data.type == 'refused') {
			$("#uploadbar-" + this.idb).empty();
			$("#uploadbar-" + this.idb).append("<font color='red' size='3'>" + data.raison + "</font>");
			$("#" + this.idb).val("");
			starteds[this.idb] = 0;
		}
	  });
	},
	setupload: function (server,id) {
		this.id = id;
		this.server = server;
		starteds[this.id] = 0;
		this.setinput();
		this.listen();
	},
	create: function() {
		var out = {};
		for (var i in fastupload) {
			out[i] = fastupload[i];
		}
		return out;
	}
}
