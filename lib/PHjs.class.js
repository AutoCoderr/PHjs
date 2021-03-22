const h = require("./Helpers"),
	rfs = require('require-from-string'),
	fs = require("fs-extra"),
	util = require("util");

class PHJSClass {
	code;
	util;
	args;
	content;
	header;
	uri;
	host;
	referer;
	libs;
	cd;
	fileName;
	ipsrc;
	session;
	varsToPass;
	global;
	c;
	callback;

	static functionInPhjs = [
		'echo',
		'echo_json',
		'include',
		'getJson',
		'getFile',
		'global_destroy',
		'session_destroy',
		'errorLog',
		'setHeader',
		'redirectTo',
		'print_r',
		'file_exist',
		'die'
	];

	constructor(args,content,header,uri,host,referer,libs,cd,fileName,ipsrc,session,varsToPass,global,c) {
		this.code = 200;
		this.util = util;

		this.setArgs(args);
		this.setContent(content);
		this.header = header;
		this.setUri(uri);
		this.setHost(host);
		this.setReferer(referer);
		this.setLibs(libs);
		this.setCd(cd);
		this.setFileName(fileName);
		this.setIpsrc(ipsrc);
		this.setSession(session);
		this.setVarsToPass(varsToPass);
		this.setGlobal(global);
		this.setCurrentRequest(c);
	}

	//setters

	setCallback(callback) {
		this.callback = callback;
	}
	setArgs(args) {
		this.args = args;
	}
	setContent(content) {
		this.content = content;
	}
	setUri(uri) {
		this.uri = uri;
	}
	setHost(host) {
		this.host = host;
	}
	setReferer(referer) {
		this.referer = referer;
	}
	setLibs(libs) {
		this.libs = libs;
	}
	setCd(cd) {
		this.cd = cd;
	}
	setFileName(fileName) {
		this.fileName = fileName;
	}
	setIpsrc(ipsrc) {
		this.ipsrc = ipsrc;
	}
	setSession(session) {
		this.session = session
	}
	setVarsToPass(varsToPass) {
		this.varsToPass = varsToPass;
	}
	setGlobal(global) {
		this.global;
	}
	setCurrentRequest(c) {
		this.c = c;
	}
	//other functions
	setHeader(keyOrObject,valueOrEcrase = false){
		if (typeof(keyOrObject) == "string" && typeof(valueOrEcrase) == "string") {
			this.header[keyOrObject] = valueOrEcrase;
		} else if (typeof(keyOrObject) == "object" && !(keyOrObject instanceof Array)) {
			let obj = keyOrObject;
			for (let key in obj) {
				this.header[key] = obj[key];
			}
			if (valueOrEcrase) {
				for (let key in this.header) {
					if (typeof(obj[key]) == "undefined") {
						delete this.header[key];
					}
				}
			}
		}
	}
	redirectTo(url, permanently = false) {
		this.setHeader({"Location": url}, true)
		this.setCode(permanently ? 301 : 302);
	}
	errorLog(e) {
		this.O.log(500,'ERROR',"\nError when process '"+this.cd+"/"+this.fileName+"' : \n"+this.util.format(e))
	}
	setCode(code) {
		this.code = code;
	}
	session_destroy = () => {
		for (let key in this.session) {
			delete this.session[key];
		}
	};
	global_destroy = () => {
		for (let key in this.global) {
			delete this.global[key];
		}
	};
	getFile = (path) => {
		if (path[0] !== "/" && path[1]+path[2] !== ":\\") {
			path = this.cd + "/" + path;
		}
		return rfs(fs.readFileSync(path, "UTF-8"));
	};
	getJson = (path) => {
		if (path[0] !== "/" && path[1]+path[2] !== ":\\") {
			path = this.cd + "/" + path;
		}
		return JSON.parse(fs.readFileSync(path, "UTF-8"));
	};
	include = (page,callback,exportVariables = false) => {
		if (page[0] !== "/" && page[1]+page[2] !== ":\\") {
			page = this.cd + "/" + page;
		}
		this.c.ProcessPageInclude(page, PHJSClass, (code, content) => {
			if (code >= 200 & code < 300) {
				if (content != null) {
					for (let i=0;i<content.length;i++) {
						this.content.push(content[i]);
					}
				} else {
					this.c.log(500,'ERROR',"EMPTY CONTENT IN INCLUDE\n");
					this.content.push("<font color='red' size='4'>Error 500 in '"+page+"'</font><br/>\n");
				}
			} else if (code<500 | code >= 600) {
				this.content.push("<font color='red' size='4'>Error 500 in '"+page+"'</font><br/>\n");
			} else {
				this.content.push("<font color='red' size='4'>Error "+code+" in '"+page+"'</font><br/>\n");
			}
			content = undefined;
			if (typeof(callback) == "function") {
				callback();
			}
		}, exportVariables);
	};

	echo = (chaine) => {
		this.content.push(chaine !== undefined && chaine !== null ? chaine.toString() : "");
	};

	echo_json = (objet) => {
		if (typeof(objet) !== "object") return;
		this.content.push(JSON.stringify(objet));
		this.setHeader("Content-Type", "application/json");
	};

	print_r = (objet) => {
		if (typeof(objet) !== "object") return;
		this.content.push(util.format(objet));
	};

	file_exist = (path) => {
		if (path[0] !== "/" && path[1]+path[2] !== ":\\") {
			path = this.cd + "/" + path;
		}
		return fs.existsSync(path);
	};

	die = (msg = null) => {
		if (msg != null) {
			this.content.push(msg);
		}
		this.callback();
		throw null;
	};
}

module.exports = PHJSClass;
