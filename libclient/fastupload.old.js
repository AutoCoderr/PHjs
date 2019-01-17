function FastUpload() {
	this.server = "";
	this.id = "";
	this.displayId = "";
	this.files = {};
	this.sockets = {};
	this.readers = {};
	this.starteds = {};
	this.setInput = () => {

		if (typeof(this.id) == "undefined") {

			alert("setinput : 'id' variable not defined");

			return;

		}

		document.getElementById(this.id).addEventListener('change',  this.selectFile);

	};
	this.selectFile = (evnt) => { 
		this.files[this.id + "-p"] = evnt.target.files[0]; 

	};
	this.upload = () => {
		if (this.starteds[this.id] == 0) {

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

					this.files[this.id] = this.files[this.id + "-p"];

					//delete this.files[this.id + "-p"];

					console.log(this.files[this.id]);
					console.log(this.files);

					this.filepart = this.files[this.id].slice(0, Math.min(262144, this.files.size));

					this.readers[this.id].readAsBinaryString(this.filepart);

					this.starteds[this.id] = 1;

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
	};

	this.listen = () => {
	  if (typeof(this.id) == "undefined") {

			alert("listen : 'id' variable not defined");

			return;

	  }

	  if (typeof(this.server) == "undefined") {

			alert("listen : 'server' variable not defined");

			return;

	  }

	  this.readers[this.id] = new FileReader();

	  this.readers[this.id].id = this.id;

	  this.readers[this.id].onload = (evnt) => {

			this.sockets[this.id].emit('Upload', { size: this.files[this.id].size, name : this.files[this.id].name, data : evnt.target.result });

	  }

	  this.sockets[this.id] = io.connect(this.server);

	  this.sockets[this.id].on('repupload', (data) => {

		if (data.type == "progress") {

			$("#uploadbar-" + this.id).empty();

			$("#uploadbar-" + this.id).append("<progress max='100' value='" + data.percent + "' form='form-id'>" + data.percent + "%</progress>");

			this.filepart = this.files[this.id].slice(data.place, data.place + Math.min(262144, (this.files[this.id].size-data.place)));

			this.readers[this.id].readAsBinaryString(this.filepart);

		} else if (data.type == "finish") {

			$("#uploadbar-" + this.id).empty();

			$("#uploadbar-"+ this.id).append("<font color='green' size='3'>File uploaded!</font>");

			$("#" + this.id).val("");

			this.starteds[this.id] = 0;

		} else if (data.type == 'refused') {

			$("#uploadbar-" + this.id).empty();

			$("#uploadbar-" + this.id).append("<font color='red' size='3'>" + data.raison + "</font>");

			$("#" + this.id).val("");

			this.starteds[this.id] = 0;

		}

	  });
	};

	this.setUpload = (server,id) => {

		this.id = id;

		this.server = server;

		this.starteds[this.id] = 0;

		this.setInput();

		this.listen();

	};
}