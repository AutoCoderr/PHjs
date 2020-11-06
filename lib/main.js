"use strict";

const http = require("http"),

	https = require("https"),

	sessions = require("client-sessions"),

	fs = require("fs-extra"),

	url = require('url'),

	formidable = require('formidable'),

	rc = require("read-chunk"),

	ft = require("file-type"),

	util = require("util"),

	PHJSClass = require("./PHjs.class"),

	h = require("./Helpers"),

	CurrentRequest = require("./CurrentRequest");

const genconf = h.genconf,
	remplace = h.remplace,
	getargs = h.getargs,
	asMIME = h.asMIME,
	openInstead = h.openInstead,
	RedirectedTo = h.RedirectedTo,
	isAuthorized = h.isAuthorized,
	canUpload = h.canUpload,
	getFileName = h.getFileName,
	getPath = h.getPath,
	lenDict = h.lenDict,
	logupload = h.logupload,
	delimiter = h.delimiter,
	cacheFiles = h.cacheFiles;



let globalVars = {};



const StartServer = function (path,proto,port,options,libs,logaccess,logerror,conffile) {

	let conf = {};

	// check if variables are corrects

	if (typeof(path) != "string") {

		throw new Error("Variable 'path' incorrecte");

	}



	if (typeof(proto) != "string") {

		throw new Error("Variable 'proto' incorrecte");

	} else if (proto != 'http' & proto != 'https') {

		throw new Error("Variable 'proto' ni http ni https");

	}
	h.proto = proto;



	if (typeof(port) != "string" & typeof(port) != "number") {

		if (proto == 'http') {

			port = 80;

		} else if (proto == 'https') {

			port = 443;

		}

	}



	if (typeof(options) != "object" | Array.isArray(options)) {

		if (proto == 'http') {

			options = {};

		} else {

			throw new Error("Variable 'options' incorrecte");

		}

	}



	if (typeof(libs) != "object" | Array.isArray(libs)) {

		libs = {};

	}



	if (typeof(path) != 'string') {

		throw new Error("Variable path incorrecte");

	} else if (!fs.existsSync(path)) {

		throw new Error("Le chemin '" + path + "' n'existe pas");

	}
	h.path = path;



	if (typeof(port) == 'string') {

		port = parseInt(port);

		if (isNaN(port)) {

			throw new Error("Variable 'port' incorrecte");

		}

	} else if (typeof(port) == "number" & isNaN(port)) {

		throw new Error("Variable 'port' incorrecte");

	}



	if (typeof(logaccess) != "string") {

		throw new Error("'logaccess' variable incorrect");

	} else if (!fs.existsSync(logaccess)) {

		fs.writeFile(logaccess, "There is the log file : \n", function(err) {

			if(err) {

				throw err;

			}

		});

	} else if (fs.statSync(logaccess).isDirectory()) {
		throw new Error("'logaccess' : '" + logaccess + "' is a directory");
	}

	h.logaccess = logaccess;



	if (typeof(logerror) != "string") {

		throw new Error("'logerror' variable incorrect");

	} else if (!fs.existsSync(logerror)) {

		fs.writeFile(logerror, "There is the error log file : \n", function(err) {

			if(err) {

				throw err;

			}

		});

	} else if (fs.statSync(logerror).isDirectory()) {
		throw new Error("'logerror' : '" + logerror + "' is a directory");
	}

	h.logerror = logerror;



	if (typeof(conffile) != "string") {

		throw new Error("'conffile' variable incorrect");

	} else if (conffile != "nothing" && conffile != "" && conffile != null) {
		if (!fs.existsSync(conffile)) {

			throw new Error("'" + conffile + "' not exist");

		} else if (fs.statSync(conffile).isDirectory()) {

			throw new Error("'" + conffile + "' is a directory");

		} else {
			h.conf = genconf(conffile);
			conf = h.conf;

			fs.watchFile(conffile, (curr, prev) => {
				try {
					h.conf = genconf(conffile);
					conf = h.conf;
					console.log("Success modif of config file");
				} catch (e) {
					console.log("Try to modif config file but failed => " + util.format(e));
				}
			});
		}
	}



	/*console.log(conf);

	console.log("");



	for (let i=0;i<conf.options.length;i++){

		console.log(conf.options[i].options);

	}

	for (let id in conf.fastupload) {
		console.log(conf.fastupload[id].allow);
		console.log(conf.fastupload[id].forbidden);
	}*/



	console.log("log files : \naccess: " + logaccess + "\nerrors: " + logerror + "\n\nconffile:\n  " + conffile);


	if (path[path.length-1] == delimiter) {

		path = path.substring(0,path.length-1);

	}

	const laSession = sessions({

		cookieName: 'session',

		secret: 'blargadeeblargblarg',

		duration: 12 * 60 * 60 * 1000,

		activeDuration: 1000 * 60 * 60 * 12

	});


	const serverScript = (req, res) => { // --------------------------> LE SERVEUR WEB <------------------------------------------------------

		let c = new CurrentRequest(PHJSClass);
		c.setPage(url.parse(req.url).pathname);
		c.setIpsrc(remplace(req.connection.remoteAddress,"::ffff:",""));
		c.setReq(req);

		c.setArgs({GET: {}, POST: {}});

		switch (req.method) {
			case "POST": // IF POST METHOD, DOWNLOADS FILES AND ARGURMENTS AND PUT IT IN THE 'ARGS' VARIABLE IN ASYNCHRONOUS FUNCTION
				const form = new formidable.IncomingForm();

				form.parse(req, function(err, fields, files) {

					if (err) {

						throw err;

					} else {

						for (let key in fields) {

							c.args.POST[key] = {content: fields[key], type: "text" };

						}

						for(let key in files) {

							c.args.POST[key] = {content: files[key], type: "file" };

						}

						const extFile = typeof(c.ext) == "undefined" ? "" : c.ext;

						if (extFile === "phjs") { // IF FILE IS PHJS, START LAUCHEPHJS()

							lauchphjs();

						} else { // ELSE IF IS NOT PHJS, DELETE DOWNLOADEDS FILES

							for (let key in files) {

								fs.remove(files[key].path, function(err) {

									if (err) {

										console.log("Error when delete '" + files[key].path + "' : ");

										console.log(err);

									}

								});

							}

						}

					}

				});
				break;
			case "GET": // IF GET METHOD, PUT ARGUMENTS IN THE 'ARGS' VARIABLE
				c.args.GET = getargs(url.parse(req.url).query);
				break;
		}

		if (process.platform == "win32"){
			c.setPage(remplace(c.page,"/","\\"));
		}

		if (c.page[c.page.length-1] == delimiter) {

			c.setPage(c.page.substring(0,c.page.length-1));

		}

		c.setPage(remplace(c.page,"%20"," "));
		c.setPage(remplace(c.page,"%22",'"'));
		c.setPage(remplace(c.page,"%C3%A9","é"));
		c.setPage(remplace(c.page,"%C3%A8","è"));
		c.setPage(remplace(c.page,"%C3%A0","à"));
		c.setPage(remplace(c.page,"%C3%B9","ù"));
		c.setPage(remplace(c.page,"%C2%AB","«"));
		c.setPage(remplace(c.page,"%25","%"));

		c.setPageExist(fs.existsSync(path + c.page));

		if (c.pageExist) {
			c.setType(fs.statSync(path + c.page).isDirectory() ? "folder" : "file");
		}

		if (c.page !== delimiter+"icons"+delimiter+"folder.gif"

			&& c.page !== delimiter+"icons"+delimiter+"unknown.gif"

			&& c.page !== delimiter+"icons"+delimiter+"image.gif"

			&& c.page !== delimiter+"icons"+delimiter+"text.gif"

			&& c.page !== delimiter+"icons"+delimiter+"binary.gif"

			&& c.page !== delimiter+"icons"+delimiter+"compressed.gif"

			&& c.page !== delimiter+"socket.io.js"

			&& c.page !== delimiter+"fastupload.js"

			&& c.page !== delimiter+"jquery.js") {

			if (c.pageExist) {
				c.setRedirected(RedirectedTo(c.page,c.type));
			} else {
				c.setRedirected(RedirectedTo(c.page,"file"));
				if (!c.redirected) {
					c.setRedirected(RedirectedTo(c.page,"folder"));
				}
			}

			if (c.redirected != false & c.redirected != "undefined") {

				res.writeHead(301, {"Location": c.redirected});

				res.end();

				c.log(301,'INFO',"REDIRECTED TO " + c.redirected);

				return;

			}
			c.setOpenInsteadPage(openInstead(c.page, path));
			if (c.openInsteadPage != c.page) {
				c.setPage(c.openInsteadPage);
				c.setPageExist(true);

				c.setType(fs.statSync(path + c.page).isDirectory() ? "folder" : "file");
			}
		}

		if (c.pageExist) { // IF PATH EXISTS, SET THE TYPE ('FOLDER' OR 'FILE')

			if(c.type === "folder") {

				c.setPage(c.page + delimiter);

			} else {

				//console.log(page);

				if (!isAuthorized(c.page,c.type)) {

					res.writeHead(403, {"Content-Type": "text/plain"});

					res.end("ERROR 403 : ACCESS FORBIDDEN");

					c.log(403,'INFO',"ACCESS FORBIDDEN");

					return;

				}

			}

		} else {

			if (c.page == delimiter+"icons"+delimiter+"folder.gif" //IF PATH DOES NOT EXIST BUT IT IS AN ICON GIF IN THIS LIST, SEND IT

				| c.page == delimiter+"icons"+delimiter+"unknown.gif"

				| c.page == delimiter+"icons"+delimiter+"image.gif"

				| c.page == delimiter+"icons"+delimiter+"text.gif"

				| c.page == delimiter+"icons"+delimiter+"binary.gif"

				| c.page == delimiter+"icons"+delimiter+"compressed.gif") {

				fs.readFile(__dirname + delimiter + ".." + c.page, function(error, content) {

					if(error){

						res.writeHead(500, {"Content-Type": "text/plain"});

						res.end("500 : INTERNAL ERROR");

						c.log(500,'ERROR',"\nError at loading of " + c.page + " : \n" + util.format(error));

					} else {

						res.writeHead(200, {"Content-Type": "image/gif"});

						res.end(content);

					}

				});

				return;

			} else if (c.page == delimiter+"socket.io.js"

				| c.page == delimiter+"fastupload.js"

				| c.page == delimiter+"jquery.js") {

				fs.readFile(__dirname + delimiter + ".."+delimiter+"libclient" + c.page, function(error, content) {

					if(error){

						res.writeHead(500, {"Content-Type": "text/plain"});

						res.end("500 : INTERNAL ERROR");

						c.log(500,'ERROR',"\nError at loading of " + c.page + " : \n" + util.format(error));

					} else {

						res.writeHead(200, {"Content-Type": "application/javascript"});

						res.end(content);

						c.log(200,'INFO',"");

					}

				});

				return;



			} else { // ELSE IF NOT EXISTS, SEND 404 ERROR

				//console.log(page);

				res.writeHead(404, {"Content-Type": "text/plain"});

				res.end("ERROR 404 : Page not found");

				c.log(404,'INFO',"PAGE NOT FOUND");

				return;

			}

		}

		if (c.type == "folder"){ // IF TYPE IS 'FOLDER', SEARCH AN INDEX OR AN FILE WITH THE NAME OF FOLDER

			let exts = ['.html','.js','.phjs'];

			if (c.page != delimiter) {
				for (let i=0;i<exts.length;i++) {
					if (fs.existsSync(path + c.page + (c.page.split(delimiter)[c.page.split(delimiter).length-2]) + exts[i]) & (c.page.split(delimiter)[c.page.split(delimiter).length-2]) != "index") {
						c.setPage(c.page + (c.page.split(delimiter)[c.page.split(delimiter).length-2]) + exts[i]);
						c.setType("file");
					}
				}

			}
			for (let i=0;i<exts.length;i++) {
				if (fs.existsSync(path +c.page + "index"+exts[i])) {
					c.setPage(c.page + "index"+exts[i]);
					c.setType("file");
				}
			}

		}

		if (c.type == "folder"){ // IF WE DO NOT FOUND AN INDEX OR OTHER FILES IN FOLDER, LISTING ALL FILES AND FOLDERS IN IT AND RETURN

			if (!isAuthorized(c.page, c.type)) {

				res.writeHead(403, {"Content-Type": "text/plain"});

				res.end("ERROR 403 : ACCESS FORBIDDEN");

				c.log(403,'INFO',"ACCESS FORBIDDEN");

				return;

			}

			fs.readdir(path + c.page, function(err, items) {

				if (err) {

					c.log(500,'ERROR',"\nError when listing '" + path.page + "'\n" + util.format(err));

					return;

				}

				res.writeHead(200, {"Content-Type": "text/html"});

				res.write("<meta charset='UTF-8'>");

				if (c.page != "/") {

					res.write("<a href='..'><font color='grey' size='4'>dossier parent</font></a>");

				}

				res.write("<table>");

				let ext;

				for (let i=0; i<items.length; i++) {

					if (fs.statSync(path + c.page + items[i]).isDirectory()) {

						res.write("<tr><td><img src='/icons/folder.gif'></td><td><a href='" + c.page + items[i] + "/'>" + items[i] + "</a></td></tr>");

					} else {

						ext = items[i].split(".")[items[i].split(".").length-1];

						if (ext == "png" | ext == "jpg" | ext == "gif" | ext == "jpeg" | ext == "bmp" | ext == "tif" | ext == "tiff") {

							res.write("<tr><td><img src='/icons/image.gif'></td>");

						} else if (ext == "gz" | ext == "tar" | ext == "zip" | ext == "rar" | ext == "7z") {

							res.write("<tr><td><img src='/icons/compressed.gif'></td>");

						} else if (ext == "txt" | ext == "log") {

							res.write("<tr><td><img src='/icons/text.gif'></td>");

						} else if (ext == "exe" | ext == "dll" | ext == "so") {

							res.write("<tr><td><img src='/icons/binary.gif'></td>");

						} else {

							res.write("<tr><td><img src='/icons/unknown.gif'></td>");

						}

						res.write("<td><a href='" + c.page + items[i] + "'>" + items[i] + "</a></td></tr>");

					}

				}

				res.end("</table>");

				c.log(200,'INFO',"");

			});

			return;

		}

		if (!isAuthorized(c.page, c.type)) {

			res.writeHead(403, {"Content-Type": "text/plain"});

			res.end("ERROR 403 : ACCESS FORBIDDEN");

			c.log(403,'INFO',"ACCESS FORBIDDEN");

			return;

		} else if (req.method == "OPTIONS") {

			res.writeHead(200, {
				"Content-Type": "text/plain",
				"Date": new Date().toGMTString(),
				"Server": "PHJS ("+(process.platform == "win32" ? "Windows" : "Unix")+")"
			});
			res.end("");
			c.log(200, 'INFO', "ACCEPT");
			return;

		}

		let mime = {mime: asMIME(c.page)}; // GET MIME DECIDED FOR THIS FILE IN CONFIG

		c.setPage(path + c.page);

		if (mime.mime == false) { // IF NO MIME DECIDED

			mime = ft(rc.sync(c.page,0,100)); // GET MIME TYPE OF THE FILE

			//console.log(mime);

		}

		if (mime == null) { // IF NO MIME FOUND

			c.setExt(c.page.split(".")[c.page.split(".").length-1]);

			if (c.ext == "phjs") { // IF FILE IS PHJS, START EXECUTING IT WITH LAUNCHPHJS()

				if (req.method == "GET") {

					lauchphjs();

				} else if (req.method == "POST") { // IF METHOD IS POST, RETURN AND WAIT FOR THE ASYNCHRONOUS FUNCTION TO START LAUCHPHJS()

					return;

				}

			} else { // ELSE IF IS NOT PHJS, SEND FILE HAS HTML

				fs.readFile(c.page, 'utf-8', function(error, content) {

					if(error){

						res.writeHead(500, {"Content-Type": "text/plain"});

						res.end("500 : INTERNAL ERROR");

						c.log(500,'ERROR',"\nError at loading of " + c.page + " : \n" + util.format(error));

					} else {

						res.writeHead(200, {"Content-Type": "text/html"});

						res.end(content);

						c.log(200,'INFO',"");

					}

				});

			}

		} else { // IF MIME FOUND

			mime = mime.mime;

			//console.log(mime);

			if (mime.replace("/","") != mime & mime.split("/")[0] == "audio") { // IF FILE IS AUDIO

				fs.stat(page, function(error,stats) {

					if (error) {

						res.writeHead(500, {"Content-Type": "text/plain"});

						res.end("500 : INTERNAL ERROR");

						c.log(500,'ERROR',"\nError at loading of " + c.page + " : \n" + util.format(error));

					} else {

						res.writeHead(200, {

							'Content-Type': 'audio/' + mime.split("/")[mime.split("/").length-1],

							'Content-Length': stats.size

						});

						c.log(200,'INFO',"");

						fs.createReadStream(c.page).pipe(res);

					}

				});

			} else if (mime.replace("/","") != mime & mime.split("/")[0] == "video") { //IF FILE IS VIDEO

				fs.stat(c.page, function(error, stats) {

					if (error) {

						res.writeHead(500, {"Content-Type": "text/plain"});

						res.end("500 : INTERNAL ERROR");

						c.log(500,'ERROR',"\nError at loading of " + c.page + " : \n" + util.format(error));

						return;

					}

					c.log(200,'INFO',"");

					const range = req.headers.range;

					const total = stats.size;

					if (!range | typeof(range) == "undefined") {

						res.writeHead(200, {

							"Content-Length": total,

							"Content-Type": "video/" + mime.split("/")[mime.split("/").length-1]

						});

						fs.createReadStream(c.page).pipe(res);

						return;

					}

					const positions = remplace(range,"bytes=", "").split("-");

					const start = parseInt(positions[0], 10);

					const end = positions[1] ? parseInt(positions[1], 10) : total - 1;

					const chunksize = (end - start) + 1;



					res.writeHead(206, {

						"Content-Range": "bytes " + start + "-" + end + "/" + total,

						"Accept-Ranges": "bytes",

						"Content-Length": chunksize,

						"Content-Type": "video/" + mime.split("/")[mime.split("/").length-1]

					});



					let stream = fs.createReadStream(c.page, { start: start, end: end })

						.on("open", function() {

							stream.pipe(res);

						})

						.on("error", function(err) {

							res.end(err);

						});

				});

			} else if (mime == "phjs" | mime == "PHJS") { //IF MIME DECIDED IS PHJS, START AS PHJS

				if (req.method == "GET") {

					lauchphjs();

				} else if (req.method == "POST") { // IF METHOD IS POST, RETURN AND WAIT FOR THE ASYNCHRONOUS FUNCTION TO START LAUCHPHJS()

					return;

				}

			} else { // IF FILE IS IMAGE OR OTHER

				fs.readFile(c.page, function(error, content) {

					if(error != null | mime.replace("/","") == mime){

						//console.log("image or other --> error \nerror : " + util.format(error));

						res.writeHead(500, {"Content-Type": "text/plain"});

						res.end("500 : INTERNAL ERROR");

						c.log(500,'ERROR',"\nError at loading of " + c.page + " : \n" + util.format(error));

					} else {

						//console.log("image or other --> success");

						res.writeHead(200, {"Content-Type": mime.split("/")[0] + "/" + mime.split("/")[mime.split("/").length-1]});

						res.end(content);

						c.log(200,'INFO',"");

					}

				});

			}

		}

		function lauchphjs() { // START PHJS

			let content = [];
			let header = {"Content-Type": "text/html"};

			let alreadySent = false;

			ProcessPage(c.page,c.args,libs,content, header, function (code) { // START FUNCTION TO PROCESS HTML PAGE FROM PHJS, AND PUT THE RESULT IN 'CONTENT' VARIABLE

				if (alreadySent) {
					content = undefined;
					return;
				}

				alreadySent = true;

				if (typeof(code) != 'number') {
					res.writeHead(500, {"Content-Type": "text/plain"});
					res.end("500 : INTERNAL ERROR");
					c.log(500,'ERROR',"INCORRECT VARIABLE TYPE FOR HTTP CODE\n");
					content = undefined;
					return;
				} else if (code >= 500 & code < 600) {
					res.writeHead(code, {"Content-Type": "text/plain"});
					res.end(code+" : INTERNAL ERROR");
					content = undefined;
					return;
				}
				res.writeHead(code, header);
				for (let i=0;i<content.length;i++) {
					res.write(content[i]);
				}
				res.end("");
				c.log(code,'INFO',"");

				content = undefined;

			});

		}



		function ProcessPage(page,args,libs,content, header,callback) { // FUNCTION TO PROCESS HTML PAGE FROM PHJS

			if (typeof(cacheFiles[page]) == "undefined") {
				cacheFiles[page] = {file: fs.readFileSync(page, "UTF-8")};

				if (!c.phjsFileToJsFunc(page)) {
					callback(500);
					return;
				}
			} else {
				let file = fs.readFileSync(page, "UTF-8");

				if (cacheFiles[page].file.length != file.length) {
					cacheFiles[page].file = file;
					if (!c.phjsFileToJsFunc(page)) {
						callback(500);
						return;
					}
				} else {
					for (let i=0;i<file.length;i++) {
						if (file[i] != cacheFiles[page].file[i]) {
							cacheFiles[page].file = file;
							if (!c.phjsFileToJsFunc(page)) {
								callback(500);
								return;
							}
							break;
						}
					}
				}
			}
			let PHJS = new PHJSClass(args,content,header,url.parse(req.url).pathname,req.headers.host,req.headers.referer,libs,getPath(page),getFileName(page),c.ipsrc,req.session,{},globalVars,c);

			c.PHJS = PHJS;

			PHJS.setCallback(function (code) {

				callback(code);

			});

			try {
				cacheFiles[page].func.start(PHJS.callback,PHJS) // TRY EXECUTE FILE, PUT RESULT IN 'CONTENT' VARIABLE, AND RETURN IT

			} catch(e) {

				if (e != null) {

					c.log(500, 'ERROR', "\nExecution error when process '" + page + "' : \n" + util.format(e));

					callback(500);
				}

			}

		}

	};



	const webserver = (req,res) => {

		laSession(req, res, function(){

			serverScript(req,res);

		});

	}

	let server;

	if (proto == 'http') {

		server = http.createServer(webserver);

	} else if (proto == 'https') {

		server = https.createServer(options, webserver);

	}

	server.listen(port);

	if (lenDict(conf.fastupload) > 0) { // Code for upload in real time using socket.io

		let finish = {};

		for (let id in conf.fastupload) {
			finish[id] = require(conf.fastupload[id].finish);
		}

		console.log("\nFastUpload server started");

		const io = require('socket.io').listen(server);

		ic.sockets.on('connection', (socket) => {

			//console.log("socket.io connected!");
			socket.srcName = "";

			socket.downloaded = 0;

			socket.data = "";

			socket.handler = 0;

			socket.on('Upload', (data) => { // --------------------------------> UPLOAD D'UN FICHIER <---------------------------------------------------------


				if (typeof(data) != "object") {

					socket.emit('repupload', { type: 'refused', raison: 'Incorrect variable'});

					logupload(remplace(socket.handshake.address,"::ffff:",""),data.name,"Incorrect variable",logerror);

				} else {

					if (typeof(data.id) == "undefined") {
						socket.emit('repupload', { type: 'refused', raison: 'Id not recognized'});
						return;
					} else if (typeof(conf.fastupload[data.id]) == "undefined") {
						socket.emit('repupload', { type: 'refused', raison: 'Id not recognized'});
						return;
					}

					if (typeof(data.name) != "string" | typeof(data.size) != "number" | typeof(data.data) != "string") {

						socket.emit('repupload', { type: 'refused', raison: 'Error: incorrect variable'});

						if (typeof(data.name) == "string") {

							logupload(remplace(socket.handshake.address,"::ffff:",""),data.name,"Incorrect variable",logerror);

						} else {

							logupload(remplace(socket.handshake.address,"::ffff:",""),"filename not found","Incorrect variable",logerror);

						}

					} else {
						if(data.size >= conf.fastupload[data.id].maxsize) {
							socket.emit('repupload', {type: 'refused', raison: 'The file is too big'});
							logupload(remplace(socket.handshake.address,"::ffff:",""),data.name,"The file is too big",logerror);
							return;
						}
						if (socket.srcName == "") {
							if (!canUpload(data.name,conf.fastupload[data.id])) {
								socket.emit('repupload', {type: 'refused', raison: 'File forbidden'});
								logupload(remplace(socket.handshake.address,"::ffff:",""),data.name,"Refused: file forbidden",logaccess);
								return;
							}
						}

						if (socket.handler == 0) {
							socket.srcName = data.name;
							socket.filename = Math.round(Math.random()*Math.pow(10,9));
							while (fs.existsSync("/tmp/" + socket.filename)) {
								socket.filename = Math.round(Math.random()*Math.pow(10,9));
							}
							socket.handler = fs.openSync("/tmp/" + socket.filename, 'a')
						}
						if (socket.srcName != data.name) {
							socket.emit('repupload', {type: 'refused', raison: 'File name changed during upload'});
							logupload(remplace(socket.handshake.address,"::ffff:",""),data.name,"File name changed during upload",logaccess);
							return;
						}

						socket.downloaded += data.data.length;

						socket.data += data.data;

						if(socket.downloaded >= data.size) { //If File is Fully Uploaded
							fs.write(socket.handler, socket.data, null, 'Binary', (err, Writen) => {
								socket.emit('repupload', {'type': 'finish'});
								logupload(remplace(socket.handshake.address,"::ffff:",""),data.name,"File successfully uploaded ",logaccess);
								socket.handler = 0;
								socket.downloaded = 0;
								socket.data = "";
								finish[data.id]("/tmp/"+socket.filename,data.name,data.size,data.token);
								socket.filename = "";
							});
						} else if(socket.data.length >= 10485760){ //If the Data Buffer reaches 10MB
							fs.write(socket.handler, socket.data, null, 'Binary', function(err, Writen){
								socket.data = ""; //Reset The Buffer
								socket.emit('repupload', { 'type': 'progress'
									, 'place' :    socket.downloaded
									, 'percent' :  (socket.downloaded / data.size) * 100});
							});
						} else {
							socket.emit('repupload', { 'type': 'progress'
								, 'place' :    socket.downloaded
								, 'percent' :  (socket.downloaded / data.size) * 100});
							//console.log("if 3");
							//console.log(socket.downloaded);
						}
					}

				}

			});

		});
	}

}



module.exports = StartServer;
