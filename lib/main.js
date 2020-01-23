"use strict";

const rfs = require('require-from-string'),

	http = require("http"),

	https = require("https"),

	sessions = require("client-sessions"),

	fs = require("fs-extra"),

	url = require('url'),

	formidable = require('formidable'),

	rc = require("read-chunk"),

	ft = require("file-type"),

	util = require("util"),

	functionsl = require(__dirname + "/functions.js");



const remplace = functionsl.remplace,

	genconf = functionsl.genconf,

	getargs = functionsl.getargs,

	isAuthorized = functionsl.isAuthorized,

	RedirectedTo = functionsl.RedirectedTo,

	asMIME = functionsl.asMIME,

	getPath = functionsl.getPath,

	getFileName = functionsl.getFileName,

	ProcessPageInclude = functionsl.ProcessPageInclude,

	copyDict = functionsl.copyDict,

	logupload = functionsl.logupload,

	equal = functionsl.equal,

	toMin = functionsl.toMin,

	canUpload = functionsl.canUpload,

	lenDict = functionsl.lenDict,

	countOccu = functionsl.countOccu,

	openInstead = functionsl.openInstead;


const delimiter = (process.platform == "win32" ? "\\" : "/");



let globalVars = {},
	cacheFiles = {};



const StartServer = function (path,proto,port,options,libs,logaccess,logerror,conffile) {

	let conf;

	// check if variables are corrects

	if (typeof(path) != "string") {

		throw new Error("Variable 'path' incorrecte");

	}



	if (typeof(proto) != "string") {

		throw new Error("Variable 'proto' incorrecte");

	} else if (proto != 'http' & proto != 'https') {

		throw new Error("Variable 'proto' ni http ni https");

	}



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

	} else if(fs.statSync(logaccess).isDirectory()) {

		throw new Error("'logaccess' : '" + logaccess + "' is a directory");

	}



	if (typeof(logerror) != "string") {

		throw new Error("'logerror' variable incorrect");

	} else if (!fs.existsSync(logerror)) {

		fs.writeFile(logerror, "There is the error log file : \n", function(err) {

			if(err) {

				throw err;

			}

		});

	} else if(fs.statSync(logerror).isDirectory()) {

		throw new Error("'logerror' : '" + logerror + "' is a directory");

	}



	if (typeof(conffile) != "string") {

		throw new Error("'conffile' variable incorrect");

	} else if (conffile == "nothing"){

		conf = {allow: [], forbidden: [], redirect: [], options: [], fastupload: {}};

	} else if (!fs.existsSync(conffile)) {

		throw new Error("'" + conffile + "' not exist");

	} else if(fs.statSync(conffile).isDirectory()) {

		throw new Error("'" + conffile + "' is a directory");

	} else {
		conf = genconf(conffile,path);

		fs.watchFile(conffile, (curr, prev) => {
			try {
				conf = genconf(conffile,path);
				console.log("Success modif of config file");
			} catch (e) {
				console.log("Try to modif config file but failed => "+util.format(e));
			}
		});
	}



	/*console.log(conf);

	console.log("");



	for (var i=0;i<conf.options.length;i++){

		console.log(conf.options[i].options);

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

		let type;

		let redirected;

		let ext;

		let page = url.parse(req.url).pathname;

		const ipsrc = remplace(req.connection.remoteAddress,"::ffff:","");

		let args = {GET: {}, POST: {}};

		res.setHeader('Access-Control-Allow-Origin', '*');

		res.setHeader('Access-Control-Request-Method', '*');

		res.setHeader('Access-Control-Allow-Headers', '*');

		switch (req.method) {
			case "POST": // IF POST METHOD, DOWNLOADS FILES AND ARGURMENTS AND PUT IT IN THE 'ARGS' VARIABLE IN ASYNCHRONOUS FUNCTION
				const form = new formidable.IncomingForm();

				form.parse(req, function(err, fields, files) {

					if (err) {

						throw err;

					} else {

						for (let key in fields) {

							args.POST[key] = {content: fields[key], type: "text" };

						}

						for(let key in files) {

							args.POST[key] = {content: files[key], type: "file" };

						}

						const extFile = typeof(ext) == "undefined" ? "" : ext;

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
				args.GET = getargs(url.parse(req.url).query);
				break;
		}

		if (process.platform == "win32"){
			page = remplace(page,"/","\\");
		}

		if (page[page.length-1] == delimiter) {

			page = page.substring(0,page.length-1);

		}

		page = remplace(page,"%20"," ");
		page = remplace(page,"%22",'"');
		page = remplace(page,"%C3%A9","é");
		page = remplace(page,"%C3%A8","è");
		page = remplace(page,"%C3%A0","à");
		page = remplace(page,"%C3%B9","ù");
		page = remplace(page,"%C2%AB","«");
		page = remplace(page,"%25","%");

		if (page !== delimiter+"icons"+delimiter+"folder.gif"

		 && page !== delimiter+"icons"+delimiter+"unknown.gif"

		 && page !== delimiter+"icons"+delimiter+"image.gif"

		 && page !== delimiter+"icons"+delimiter+"text.gif"

		 && page !== delimiter+"icons"+delimiter+"binary.gif"

		 && page !== delimiter+"icons"+delimiter+"compressed.gif"

		 && page !== delimiter+"socket.io.js"

		 && page !== delimiter+"fastupload.js"

		 && page !== delimiter+"jquery.js") {
			page = openInstead(page, conf, path);
		}

		if (fs.existsSync(path + page)) { // IF PATH EXISTS, SET THE TYPE ('FOLDER' OR 'FILE')

			if(fs.statSync(path + page).isDirectory()) {

				type = "folder";

				page = page + delimiter;

			} else {

				type = "file";

				//console.log(page);

				if (!isAuthorized(page,conf,type)) {

					res.writeHead(403, {"Content-Type": "text/plain"});

					res.end("ERROR 403 : ACCESS FORBIDDEN");

					log(403,'INFO',"ACCESS FORBIDDEN");

					return;

				}

				redirected = RedirectedTo(page,conf,type);

				if (redirected != false & redirected != "undefined") {

					res.writeHead(301, {"Location": redirected});

					res.end();

					log(301,'INFO',"REDIRECTED TO " + redirected);

					return;

				}

			}

		} else {

			if (page == delimiter+"icons"+delimiter+"folder.gif" //IF PATH DOES NOT EXIST BUT IT IS AN ICON GIF IN THIS LIST, SEND IT

				| page == delimiter+"icons"+delimiter+"unknown.gif"

				| page == delimiter+"icons"+delimiter+"image.gif"

				| page == delimiter+"icons"+delimiter+"text.gif"

				| page == delimiter+"icons"+delimiter+"binary.gif"

				| page == delimiter+"icons"+delimiter+"compressed.gif") {

				fs.readFile(__dirname + delimiter + ".." + page, function(error, content) {

					if(error){

						res.writeHead(500, {"Content-Type": "text/plain"});

						res.end("500 : INTERNAL ERROR");

						log(500,'ERROR',"\nError at loading of " + page + " : \n" + util.format(error));

					} else {

						res.writeHead(200, {"Content-Type": "image/gif"});

						res.end(content);

					}

				});

				return;

			} else if (page == delimiter+"socket.io.js"

				| page == delimiter+"fastupload.js"

				| page == delimiter+"jquery.js") {

				fs.readFile(__dirname + delimiter + ".."+delimiter+"libclient" + page, function(error, content) {

					if(error){

						res.writeHead(500, {"Content-Type": "text/plain"});

						res.end("500 : INTERNAL ERROR");

						log(500,'ERROR',"\nError at loading of " + page + " : \n" + util.format(error));

					} else {

						res.writeHead(200, {"Content-Type": "application/javascript"});

						res.end(content);

						log(200,'INFO',"");

					}

				});

				return;



			} else { // ELSE IF NOT EXISTS, SEND 404 ERROR

				//console.log(page);

				res.writeHead(404, {"Content-Type": "text/plain"});

				res.end("ERROR 404 : Page not found");

				log(404,'INFO',"PAGE NOT FOUND");

				return;

			}

		}

		if (type == "folder"){ // IF TYPE IS 'FOLDER', SEARCH AN INDEX OR AN FILE WITH THE NAME OF FOLDER

			let exts = ['.html','.js','.phjs'];

			if (page != delimiter) {
				for (let i=0;i<exts.length;i++) {
					if (fs.existsSync(path + page + (page.split(delimiter)[page.split(delimiter).length-2]) + exts[i]) & (page.split(delimiter)[page.split(delimiter).length-2]) != "index") {
						page = page + (page.split(delimiter)[page.split(delimiter).length-2]) + exts[i];
						type = "file";
					}
				}

			}
			for (let i=0;i<exts.length;i++) {
				if (fs.existsSync(path + page + "index"+exts[i])) {
					page = page + "index"+exts[i];
					type = "file";
				}
			}

		}

		if (type == "folder"){ // IF WE DO NOT FOUND AN INDEX OR OTHER FILES IN FOLDER, LISTING ALL FILES AND FOLDERS IN IT AND RETURN

			if (!isAuthorized(page,conf,type)) {

				res.writeHead(403, {"Content-Type": "text/plain"});

				res.end("ERROR 403 : ACCESS FORBIDDEN");

				log(403,'INFO',"ACCESS FORBIDDEN");

				return;

			}

			redirected = RedirectedTo(page,conf,type);

			if (redirected != false & redirected != "undefined") {

				res.writeHead(301, {"Location": redirected});

				res.end();

				log(301,'INFO',"REDIRECTED TO " + redirected);

				return;

			}

			fs.readdir(path + page, function(err, items) {

				if (err) {

					log(500,'ERROR',"\nError when listing '" + path.page + "'\n" + util.format(err));

					return;

				}

				res.writeHead(200, {"Content-Type": "text/html"});

				res.write("<meta charset='UTF-8'>");

				if (page != "/") {

					res.write("<a href='..'><font color='grey' size='4'>dossier parent</font></a>");

				}

				res.write("<table>");

				let ext;

				for (let i=0; i<items.length; i++) {

					if (fs.statSync(path + page + items[i]).isDirectory()) {

						res.write("<tr><td><img src='/icons/folder.gif'></td><td><a href='" + page + items[i] + "/'>" + items[i] + "</a></td></tr>");

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

						res.write("<td><a href='" + page + items[i] + "'>" + items[i] + "</a></td></tr>");

					}

				}

				res.end("</table>");

				log(200,'INFO',"");

			});

			return;

		}

		if (!isAuthorized(page,conf,type)) {

			res.writeHead(403, {"Content-Type": "text/plain"});

			res.end("ERROR 403 : ACCESS FORBIDDEN");

			log(403,'INFO',"ACCESS FORBIDDEN");

			return;

		} else if (req.method == "OPTIONS") {

			res.writeHead(200, {
				"Content-Type": "text/plain",
				"Date": new Date().toGMTString(),
				"Server": "PHJS ("+(process.platform == "win32" ? "Windows" : "Unix")+")"
			});
			res.end("");
			log(200, 'INFO', "ACCEPT");
			return;

		}

		redirected = RedirectedTo(page,conf,type);

		if (redirected != false & redirected != "undefined") {

			res.writeHead(301, {"Location": redirected});

			res.end();

			log(301,'INFO',"REDIRECTED TO " + redirected);

			return;

		}

		let mime = {mime: asMIME(page,conf)} // GET MIME DECIDED FOR THIS FILE IN CONFIG

		page = path + page;

		if (mime.mime == false) { // IF NO MIME DECIDED

			mime = ft(rc.sync(page,0,100)); // GET MIME TYPE OF THE FILE

			//console.log(mime);

		}

		if (mime == null) { // IF NO MIME FOUND

			ext = page.split(".")[page.split(".").length-1];

			if (ext == "phjs") { // IF FILE IS PHJS, START EXECUTING IT WITH LAUNCHPHJS()

				if (req.method == "GET") {

					lauchphjs();

				} else if (req.method == "POST") { // IF METHOD IS POST, RETURN AND WAIT FOR THE ASYNCHRONOUS FUNCTION TO START LAUCHPHJS()

					return;

				}

			} else { // ELSE IF IS NOT PHJS, SEND FILE HAS HTML

				fs.readFile(page, 'utf-8', function(error, content) {

					if(error){

						res.writeHead(500, {"Content-Type": "text/plain"});

						res.end("500 : INTERNAL ERROR");

						log(500,'ERROR',"\nError at loading of " + page + " : \n" + util.format(error));

					} else {

						res.writeHead(200, {"Content-Type": "text/html"});

						res.end(content);

						log(200,'INFO',"");

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

						log(500,'ERROR',"\nError at loading of " + page + " : \n" + util.format(error));

					} else {

						res.writeHead(200, {

							'Content-Type': 'audio/' + mime.split("/")[mime.split("/").length-1],

							'Content-Length': stats.size

						});

						log(200,'INFO',"");

						fs.createReadStream(page).pipe(res);

					}

				});

			} else if (mime.replace("/","") != mime & mime.split("/")[0] == "video") { //IF FILE IS VIDEO

				fs.stat(page, function(error, stats) {

					if (error) {

						res.writeHead(500, {"Content-Type": "text/plain"});

						res.end("500 : INTERNAL ERROR");

						log(500,'ERROR',"\nError at loading of " + page + " : \n" + util.format(error));

						return;

					}

					log(200,'INFO',"");

					const range = req.headers.range;

					const total = stats.size;

					if (!range | typeof(range) == "undefined") {

						res.writeHead(200, {

							"Content-Length": total,

							"Content-Type": "video/" + mime.split("/")[mime.split("/").length-1]

						});

						fs.createReadStream(page).pipe(res);

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



					let stream = fs.createReadStream(page, { start: start, end: end })

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

				fs.readFile(page, function(error, content) {

					if(error != null | mime.replace("/","") == mime){

						//console.log("image or other --> error \nerror : " + util.format(error));

						res.writeHead(500, {"Content-Type": "text/plain"});

						res.end("500 : INTERNAL ERROR");

						log(500,'ERROR',"\nError at loading of " + page + " : \n" + util.format(error));

					} else {

						//console.log("image or other --> success");

						res.writeHead(200, {"Content-Type": mime.split("/")[0] + "/" + mime.split("/")[mime.split("/").length-1]});

						res.end(content);

						log(200,'INFO',"");

					}

				});

			}

		}

		function lauchphjs() { // START PHJS

			let content = [];
			let header = {"Content-Type": "text/html"};

			let alreadySent = false;

			ProcessPage(page,args,libs,content, header, function (code) { // START FUNCTION TO PROCESS HTML PAGE FROM PHJS, AND PUT THE RESULT IN 'CONTENT' VARIABLE

				if (alreadySent) {
					content = undefined;
					return;
				}

				alreadySent = true;

				if (typeof(code) != 'number') {
					res.writeHead(500, {"Content-Type": "text/plain"});
					res.end("500 : INTERNAL ERROR");
					log(500,'ERROR',"INCORRECT VARIABLE TYPE FOR HTTP CODE\n");
					content = undefined;
					return;
				} else if (code >= 500 & code < 600) {
					res.writeHead(code, {"Content-Type": "text/plain"});
					res.end(code+" : INTERNAL ERROR");
					content = undefined;
					return;
				} else if (code < 200 | code >= 300){
					res.writeHead(500, {"Content-Type": "text/plain"});
					res.end("500 : INTERNAL ERROR");
					log(500,'ERROR',"INVALID HTTP CODE\n");
					content = undefined;
					return;
				}

				res.writeHead(code, header);
				for (let i=0;i<content.length;i++) {
					if (header["Content-Type"] === "application/json") {
						res.end(content[i]);
						break;
					} else {
						res.write(content[i]);
					}
				}
				if (header["Content-Type"] !== "application/json") {
					res.end("");
				}
				log(200,'INFO',"");

				content = undefined;

			});

		}



		function ProcessPage(page,args,libs,content, header,callback) { // FUNCTION TO PROCESS HTML PAGE FROM PHJS

			if (typeof(cacheFiles[page]) == "undefined") {
				cacheFiles[page] = {file: fs.readFileSync(page, "UTF-8")};

				if (!phjsFileToJsFunc(page)) {
					callback(500);
					return;
				}
			} else {
				let file = fs.readFileSync(page, "UTF-8");

				if (cacheFiles[page].file.length != file.length) {
					cacheFiles[page].file = file;
					if (!phjsFileToJsFunc(page)) {
						callback(500);
						return;
					}
				} else {
					for (let i=0;i<file.length;i++) {
						if (file[i] != cacheFiles[page].file[i]) {
							cacheFiles[page].file = file;
							if (!phjsFileToJsFunc(page)) {
								callback(500);
								return;
							}
							break;
						}
					}
				}
			}

			let PHJS = {code: 200, util: util, args: args, content: content, header: header, libs: libs, cd: getPath(page), fileName: getFileName(page), ipsrc: ipsrc, session: req.session, includeVars: {}, global: globalVars,
				log: log,
				errorLog: function(e) {
					PHJS.log(500,'ERROR',"\nError when process '"+PHJS.cd+"/"+PHJS.fileName+"' : \n"+PHJS.util.format(e))
				}, setCode: function(code) {
					PHJS.code = code;
				}, session_destroy: () => {
					for (let key in PHJS.session) {
						delete PHJS.session[key];
					}
				}, global_destroy: () => {
					for (let key in PHJS.global) {
						delete PHJS.global[key];
					}
				}, include: (page,callback) => {
					ProcessPageInclude(page,PHJS,cacheFiles,phjsFileToJsFunc, (code,content) => {
						if (code >= 200 & code < 300) {
							if (content != null) {
								for (let i=0;i<content.length;i++) {
									PHJS.content.push(content[i]);
								}
							} else {
								log(500,'ERROR',"EMPTY CONTENT IN INCLUDE\n");
								PHJS.content.push({type: "html", chaine: "<font color='red' size='4'>Error 500 in '"+page+"'</font><br/>\n"});
							}
						} else if (code<500 | code >= 600) {

						} else {
							PHJS.content.push({type: "html", chaine: "<font color='red' size='4'>Error "+code+" in '"+page+"'</font><br/>\n"});
						}
						content = undefined;
						if (typeof(callback) == "function") {
							callback();
						}
					});
				}, setHeader: (key,value) => {
					PHJS.header[key] = value;
				}};

			try {

				cacheFiles[page].func.start(function (code) {

					callback(code);

				},PHJS, function (chaine) { PHJS.content.push(chaine) },function (objet) { PHJS.content.push(JSON.stringify(objet)); PHJS.setHeader("Content-Type", "application/json"); }); // TRY EXECUTE FILE, PUT RESULT IN 'CONTENT' VARIABLE, AND RETURN IT

			} catch(e) {

				log(500,'ERROR',"\nExecution error when process '" + page + "' : \n" + util.format(e));

				callback(500);

			}

		}

		function phjsFileToJsFunc(key) {
			let file = cacheFiles[key].file;

			if (countOccu(file,"<?phjs") != countOccu(file,"?>")) {
				log(500,'ERROR',"\nBad '<?phjs ?>' tags in '"+page+"'");
				return false;
			}

			let isphjs = 0;

			for (let i=0;i<file.length;i++) {
				if (file[i]+file[i+1]+file[i+2]+file[i+3]+file[i+4]+file[i+5] == "<?phjs") {
					if (isphjs == 1) {
						log(500,'ERROR',"\nBad '<?phjs ?>' tags in '"+page+"'");
						return false;
					} else {
						isphjs = 1;
					}
				} else if (file[i]+file[i+1] == "?>") {
					if (isphjs == 0) {
						log(500,'ERROR',"\nBad '<?phjs ?>' tags in '"+page+"'");
						return false;
					} else {
						isphjs = 0;
					}
				}
			}

			isphjs = 0;

			let htl = new Array();

			let ht = {};

			for (let i=0;i<file.length;i++) { // LOCATE NON PHJS CODE IN THE FILE

				if (file[i]+file[i+1]+file[i+2]+file[i+3]+file[i+4]+file[i+5] == "<?phjs") {

					isphjs = 1;

					if (typeof(ht.debut) != "undefined") {

						ht.fin = i;

						htl.push(ht);

					}

					ht = {};

					i += 5;

				} else if (file[i]+file[i+1] == "?>"){

					isphjs = 0;

					ht.debut = i+2;

					i += 1;

				} else if (i == 0) {

					ht.debut = 0;

				} else if (i == file.length-1 & isphjs == 0) {

					ht.fin = file.length;

					htl.push(ht);

				}

			}

			let newht;

			let dif = 0;

			for (let i=0;i<htl.length;i++) { // PUT ALL NON PHJS CODE IN 'ECHO' FUNCTION, 'ECHO' FUNCTION IS LIKE 'ECHO' IN PHP, TO GENERATE THE HTML PAGE

				htl[i].debut = htl[i].debut + dif;

				htl[i].fin = htl[i].fin + dif;

				newht = file.substring(htl[i].debut,htl[i].fin);

				file = (file.substring(0,htl[i].debut) + "\necho(`" + remplace(remplace(newht,"`","\\'"),"\\'","\\`") + "`); " + file.substring(htl[i].fin,file.length));

				dif += (("\necho(`" + remplace(remplace(newht,"`","\\'"),"\\'","\\`") + "`); ").length - newht.length);

			}

			file = remplace(file,"<?phjs",""); // DROP PHJS TAGS FROM FILE

			file = remplace(file,"?>","");

			if (file.replace("--END--","") == file) {
				file += "\n--END--";
			}
			file = remplace(file,"--END--","\ncallback(PHJS.code,PHJS.content);");


			file = "\"use strict\"; function start(callback,PHJS,echo,echo_json) { const print = echo; \n"+file+" } module.exports = { start: start };" // PUT FILE IN A FUNCTION FOR EXECUTE HIS JAVASCRIPT CODE

			let func;

			try {

				func = rfs(file); //TRY IMPORT FILE

			} catch(e) {

				log(500,'ERROR',"\nSyntax error when process '" + page + "' : \n" + util.format(e));

				return false;

			}

			cacheFiles[key].func = func;

			return true;
		}



		function log(code,type,msg,err) {

			const date = new Date();

			let dst;

			let logfile;

			if (type == "INFO") {

				logfile = logaccess;

			} else if (type == "ERROR") {

				logfile = logerror;

			}

			dst = proto + "://" + req.headers.host + url.parse(req.url).pathname;

			if (req.method == "GET" & url.parse(req.url).query != null) {

				dst = dst + "?" + url.parse(req.url).query;

			}

			fs.appendFileSync(logfile,

				(date.getFullYear() + '/' + (date.getMonth()+1) + '/' + date.getDate() + "  " + date.getHours() + ':' + date.getMinutes() + ':' + date.getSeconds() + ' => ' + remplace(req.connection.remoteAddress,'::ffff:','') + ' => ' + req.method + ' ' + dst + ' CODE ' + code + ' ; ' + req.headers['user-agent'] + ' ' + msg + '\n'));

		}



	}



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

	server.listen(port)

	if (lenDict(conf.fastupload) > 0) { // Code for upload in real time using socket.io

		let finish = {};

		for (let id in conf.fastupload) {
			finish[id] = require(conf.fastupload[id].finish);
		}

		console.log("\nFastUpload server started");

		const io = require('socket.io').listen(server);

		io.sockets.on('connection', (socket) => {

			//console.log("socket.io connected!");
			socket.SrcName = "";

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
							socket.SrcName = data.name;
							socket.filename = Math.round(Math.random()*Math.pow(10,9));
							while (fs.existsSync("/tmp/" + socket.filename)) {
								socket.filename = Math.round(Math.random()*Math.pow(10,9));
							}
							socket.handler = fs.openSync("/tmp/" + socket.filename, 'a')
						}
						if (socket.SrcName != data.name) {
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

