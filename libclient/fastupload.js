function FastUpload() {
	this.server = "";
	this.id = "";
	this.displayId = "";
	this.started = 0;
	this.file = "";
	this.setInput = () => {

		if (typeof(this.id) == "undefined") {

			alert("setinput : 'id' variable not defined");

			return;

		}

		document.getElementById(this.id).addEventListener('change',  this.selectFile);

	};
	this.selectFile = (evnt) => { 
		if (this.started == 0) {
			this.file = evnt.target.files[0];
		}  else {
			$("#"+this.id).val("");
		}

	};
	this.upload = () => {
		if (this.started == 0) {

		if (this.file != "") {

			this.filepart = this.file.slice(0, Math.min(262144, this.file.size));

			this.reader.readAsBinaryString(this.filepart);

			this.started = 1;

		} else {

			$(this.displayId).empty();

			$(this.displayId).append("<font color='red' size='3'>No file chosen</font>");

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

	  this.reader = new FileReader();

	  this.reader.id = this.id;

	  this.reader.onload = (evnt) => {

			this.socket.emit('Upload', { size: this.file.size, name : this.file.name, data : evnt.target.result, token: this.token, id: this.fastUploadId});

	  }

	  this.socket = io.connect(this.server);

	  this.socket.on('repupload', (data) => {

		if (data.type == "progress") {

			$(this.displayId).empty();

			$(this.displayId).append("<progress max='100' value='" + data.percent + "' form='form-id'>" + data.percent + "%</progress><br/>" + Math.round(parseFloat(data.percent)*100)/100 + "%");

			this.filepart = this.file.slice(data.place, data.place + Math.min(262144, (this.file.size-data.place)));

			this.reader.readAsBinaryString(this.filepart);

		} else if (data.type == "finish") {

			$(this.displayId).empty();

			$(this.displayId).append("<font color='green' size='3'>File uploaded!</font>");

			$("#" + this.id).val("");

			this.file = "";

			this.started = 0;

			this.token = "";

			this.callback();

		} else if (data.type == 'refused') {

			$(this.displayId).empty();

			$(this.displayId).append("<font color='red' size='3'>" + data.raison + "</font>");

			$("#" + this.id).val("");

			this.started = 0;

			this.callback("refused : "+data.raison);

		}

	  });
	};

	this.setUpload = (server,id,displayId,callback,fastUploadId,token) => {

		if(fastUploadId) {
			this.fastUploadId = fastUploadId;
		} else {
			alert("fastUploadId not specified");
			return;
		}

		if (token) {
			this.token = token;
		} else {
			this.token = "";
		}

		this.callback = callback;

		this.displayId = "#"+displayId;

		this.id = id;

		this.server = server;

		this.started = 0;

		this.setInput();

		this.listen();

	};
}