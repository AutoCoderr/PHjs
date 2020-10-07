const fs = require('fs-extra'),
	rfs = require('require-from-string'),
	url = require('url'),
	util = require('util');

class OtherFunctions {
	static delimiter = (process.platform === "win32" ? "\\" : "/");
	static cacheFiles = {};
	static logaccess;
	static logerror;
	static conf = {allow: [], forbidden: [], redirect: [], options: [], fastupload: {}};
	static proto;
	static path;
	type;
	redirected;
	ext;
	page;
	req;
	pageExist;
	openInsteadPage;
	ipsrc;
	args;
	PHJSClass;
	PHJS;



	constructor(PHJSClass) {
		this.PHJSClass = PHJSClass;
	}

	//setters

	setType(type) {
		this.type = type;
	}
	setRedirected(redirected) {
		this.redirected = redirected;
	}
	setExt(ext) {
		this.ext = ext;
	}
	setPage(page) {
		this.page = page;
	}
	setReq(req) {
		this.req = req;
	}
	setPageExist(pageExist) {
		this.pageExist = pageExist;
	}
	setOpenInsteadPage(openInsteadPage) {
		this.openInsteadPage = openInsteadPage;
	}
	setIpsrc(ipsrc) {
		this.ipsrc = ipsrc;
	}
	setArgs(args) {
		this.args = args;
	}




	static genconf(conffile) { // read config file and create a variable from this

		let confstr = fs.readFileSync(conffile, "UTF-8"); // String of config file

		let quote = false;
		for (let i=0;i<confstr.length;i++) {
			if (confstr[i] === "'") {
				if (quote === "'") {
					quote = false;
				} else if (!quote) {
					quote = "'";
				}
			} else if (confstr[i] === '"') {
				if (quote === '"') {
					quote = false;
				} else if (!quote) {
					quote = '"';
				}
			}

			if (i < confstr.length-1 && !quote) {
				if (confstr[i] + confstr[i + 1] === "//" || confstr[i] === "#") {
					let start = i;
					while (i < confstr.length - 1) {
						if (confstr[i] === "\n" || confstr[i] === "\r") {
							break;
						}
						i += 1;
					}
					let end = i;
					confstr = confstr.substring(0, start) + confstr.substring(end, confstr.length);
					i -= end-start;
				} else if (confstr[i] + confstr[i + 1] === "/*") {
					let start = i;
					while (i < confstr.length - 1) {
						if (confstr[i]+confstr[i+1] === "*/") {
							i += 2;
							break;
						}
						i += 1;
					}
					let end = (i <= confstr.length ? i : confstr.length);
					confstr = confstr.substring(0, start) + confstr.substring(end, confstr.length);
					i -= end-start;
				}

			}
		}


		let conf = {allow: [], forbidden: [], redirect: [], options: [], fastupload: {}}; // Object variable will contain config

		let id;

		let b;

		let nextword;

		let nextwordB;

		let last;

		let lastO;

		let target;

		let i = 0;

		while (i<confstr.length) {

			nextword = getnextword();

			if (o.equal(nextword,"forbidden") | o.equal(nextword,"allow")) {

				//console.log(nextword);

				if (confstr[i] != ':') {

					if (getnextword([':']) != ':') {

						throw new Error("Please put ':' after '" + nextword + "'");

					}

				} else if (i == confstr.length-1) {

					throw new Error("Incomplete file");

				}

				b = 1;

				while (b == 1) {

					nextwordB = getnextword();

					if (nextwordB[nextwordB.length-1] == "/") {

						nextwordB = nextwordB.substring(0,nextwordB.length-1);

					}

					if (process.platform == "win32") {
						nextwordB = o.remplace(nextwordB,"/","\\");
					}

					conf[nextword.toLowerCase()].push(nextwordB);

					if (isnextword(";")) {

						b = 0;

					} else if (!isnextword(",")) {

						throw new Error("Incomplete file");

					}

				}

			} else if (o.equal(nextword,"redirect")){

				//console.log("redirect");

				if (confstr[i] != ':') {

					if (getnextword([':']) != ':') {

						throw new Error("Please put ':' after '" + nextword + "'");

					}

				} else if (i == confstr.length-1) {

					throw new Error("Incomplete file");

				}

				b = 1;

				while (b == 1) {

					i += 1;

					nextwordB = getnextword([":"])

					if (nextwordB[nextwordB.length-1] == "/") {

						nextwordB = nextwordB.substring(0,nextwordB.length-1);

					}

					if (process.platform == "win32") {
						nextwordB = o.remplace(nextwordB,"/","\\");
					}

					conf.redirect.push({elem: nextwordB});

					if (isnextword("to")) {

						last = conf.redirect.length-1;

						conf.redirect[last].redirect = getnextword([":"]);

						if (isnextword(";")) {

							b = 0;

						} else if (!isnextword(",")) {

							throw new Error("Incomplete file");

						}

					} else {

						throw new Error("Incomplete file");

					}

				}

			} else if (o.equal(nextword,"fastupload")) {

				if (confstr[i] != ':') {

					if (getnextword([':']) != ':') {

						throw new Error("Please put ':' after '" + nextword + "'");

					}

				} else if (i == confstr.length - 1) {

					throw new Error("Incomplete file");

				}

				b = 1;

				while (b == 1) {

					nextword = getnextword([";", ","]);

					if (o.equal(nextword, "id")) {
						id = getnextword();
						if (typeof (conf.fastupload[id]) != "undefined") {
							throw new Error("Id fastupload '" + id + "' is already defined");
						}
						conf.fastupload[id] = {};
					} else if (o.equal(nextword, "maxsize")) {

						if (typeof (conf.fastupload[id]) == "undefined") {
							throw new Error("Please first define id");
						}

						if (typeof (conf.fastupload[id].maxsize) != "undefined") {

							throw new Error("Maxsize is already defined for FastUpload");

						}

						nextwordB = getnextword();

						if (nextwordB != "NaN" & nextwordB == parseInt(nextwordB).toString()) {

							conf.fastupload[id].maxsize = parseInt(nextwordB);

						} else {

							throw new Error("'" + nextwordB + "' is not a valid number for maxsize");

						}

					} else if (o.equal(nextword, "finish")) {

						if (typeof (conf.fastupload[id]) == "undefined") {
							throw new Error("Please first define id");
						}

						if (typeof (conf.fastupload[id].finish) != "undefined") {

							throw new Error("Finish function is already defined for FastUpload");

						}

						nextwordB = getnextword([":"]);

						if (fs.existsSync(nextwordB)) {
							if (!fs.statSync(nextwordB).isDirectory()) {
								conf.fastupload[id].finish = nextwordB;
							} else {
								throw new Error("'" + nextwordB + "' is a directory");
							}
						} else {
							throw new Error("'" + nextwordB + "' does not exist");
						}

					} else if (o.equal(nextword, "forbidden")) {

						if (typeof (conf.fastupload[id]) == "undefined") {
							throw new Error("Please first define id");
						}

						if (typeof (conf.fastupload[id].forbidden) != "undefined") {

							throw new Error("Forbidden files names are already defined for FastUpload");

						}
						conf.fastupload[id].forbidden = [];

						nextwordB = getnextword();
						conf.fastupload[id].forbidden.push(nextwordB);

						while (isnextword(",")) {
							nextwordB = getnextword();
							conf.fastupload[id].forbidden.push(nextwordB);
						}

					} else if (o.equal(nextword, "allow")) {

						if (typeof (conf.fastupload[id]) == "undefined") {
							throw new Error("Please first define id");
						}

						if (typeof (conf.fastupload[id].allow) != "undefined") {

							throw new Error("Allowed files names are already defined for FastUpload");

						}
						conf.fastupload[id].allow = [];

						nextwordB = getnextword();
						conf.fastupload[id].allow.push(nextwordB);

						while (isnextword(",")) {
							nextwordB = getnextword();
							conf.fastupload[id].allow.push(nextwordB);
						}

					} else if (nextword == "&" | nextword == ";") {

						if (typeof (conf.fastupload[id].maxsize) != "undefined" & typeof (conf.fastupload[id].finish) != "undefined") {
							if (typeof (conf.fastupload[id].allow) == "undefined") {
								conf.fastupload[id].allow = [];
							}
							if (typeof (conf.fastupload[id].forbidden) == "undefined") {
								conf.fastupload[id].forbidden = [];
							}
							if (nextword == ";") {
								b = 0;
							} else if (nextword == "&") {
								id = undefined;
							}

						} else {

							throw new Error("FastUpload not correctly configured");

						}

					} else {

						throw new Error("Incomplete file");

					}

				}

			} else {

				i -= nextword.length;

				if (isnextword('option(')) {

					//console.log("options");

					target = getnextword();

					if (target[target.length-1] == "/") {

						target = target.substring(0,target.length-1);

					}

					if (process.platform == "win32") {
						target = o.remplace(target,"/","\\");
					}

					if (confstr[i] != ")") {

						if (getnextword([')']) != ')') {

							throw new Error("Please put ')' after 'option(" + target + "'");

						}

					} else if (i == confstr.length-1) {

						throw new Error("Incomplete file");

					}

					i += 1;

					if (confstr[i] != ":") {

						if (getnextword([':']) != ':') {

							throw new Error("Please put ':' after 'option(" + target + ")'");
						}

					} else if (i == confstr.length-1) {

						throw new Error("Incomplete file");

					}

					i += 1;

					conf.options.push({});

					last = conf.options.length-1;

					conf.options[last].target = o.removeLastSlash(target);

					conf.options[last].options = [];

					b = 1;

					while (b == 1){

						if (i>=confstr.length) {

							throw new Error("Incomplete file");

						}

						if (isnextword('file')) {

							conf.options[last].options.push({file: getnextword()});

							nextword = getnextword();

							if (o.equal(nextword,"as") | o.equal(nextword,"is") | o.equal(nextword,"redirect") | o.equal(nextword,"openinstead")) {

								//console.log("options/options");

								lastO = conf.options[last].options.length-1;

								conf.options[last].options[lastO].type = nextword.toLowerCase();

								nextword = getnextword([":"]);

								if (conf.options[last].options[lastO].type === "openinstead" && !fs.existsSync(o.path + nextword)) {
									throw new Error("File or folder '"+o.path + nextword+"' does not exist");
								}

								conf.options[last].options[lastO].val = nextword;

								if (isnextword(";")) {

									b = 0;

								} else if (!isnextword(",")) {

									throw new Error("Please put ',' or ';' after '" + nextword + "'");

								}

							} else {

								throw new Error("Incomplete file");

							}

						} else {

							throw new Error("Incomplete file");

						}

					}

					if (isnextword("recursive")) {

						nextword = getnextword();

						if (o.equal(nextword,"yes") | o.equal(nextword,"no")) {

							conf.options[last].recursive = nextword.toLowerCase();

						} else {

							throw new Error("Please put 'yes' or 'no' after 'recursive'");

						}

					} else {

						conf.options[last].recursive = "no";

					}

				} else if (getnextword() == "") {

					i = confstr.length;

				} else {

					throw new Error("Incomplete file");

				}

			}

		}

		return conf;



		function isnextword(word) {

			let isword;

			for (let j=i;j<confstr.length;j++) {

				if (confstr[j] != " " & confstr[j] != "\n" & confstr[j] != "\r" & confstr[j] != "\t" & confstr[j] != "" ) {

					isword = true;

					for(let k=0;k<word.length;k++) {

						if (j+k >= confstr.length) {

							isword = false;

							break;

						} else if (confstr[j+k].toLowerCase() != word[k].toLowerCase()) {

							isword = false;

							break;

						}

					}

					if (isword == true) {

						i = j+word.length;

						if (i>=confstr.length & word != ";" & !o.equal(word,"yes") & !o.equal(word,"no")) {

							throw new Error("Incomplete file");

						}

					}

					break;

				}

				if (j >= confstr.length-1) {

					isword = false;

				}

			}

			if (isword != true & isword != false) {

				isword = false;

			}

			return isword;

		}

		function getnextword(noskip) {

			if (!Array.isArray(noskip)) {

				noskip = [];

			}

			const toskip = [" ","\n","\r","\t",",",";",":","(",")"];

			let nextword = "";

			for (let j=i;j<confstr.length;j++) {

				if (confstr[j] == "'" | confstr[j] == '"'){
					let delimiter = confstr[j];
					j += 1;
					while(confstr[j] != delimiter) {
						nextword += confstr[j];
						j += 1;
					}

					i = j+1;

					if (i>=confstr.length & nextword != ";" & !o.equal(nextword,"yes") & !o.equal(nextword,"no")) {

						throw new Error("Incomplete file");

					}

					break;

				} else if (isok(j)) {
					while(isok(j) & j<confstr.length) {
						nextword += confstr[j];
						j += 1;
					}

					i = j;

					if (i>=confstr.length & nextword != ";" & !o.equal(nextword,"yes") & !o.equal(nextword,"no")) {
						throw new Error("Incomplete file");
					}

					break;

				}

			}

			return nextword;

			function isok(index){

				let out = true;

				for (let k=0;k<toskip.length;k++) {

					let allEqual = true;
					for (let l=0;l<toskip[k].length;l++) {
						if (index+l > confstr.length-1) {
							allEqual = false;
							break;
						}
						if (confstr[index+l] != toskip[k][l]) {
							allEqual = false;
							break;
						}
					}

					if (allEqual) {

						out = false;

						break;

					}

				}

				if (out == false) {

					for (let k=0;k<noskip.length;k++) {

						let allEqual = true;
						for (let l=0;l<noskip[k].length;l++) {
							if (index+l > confstr.length-1) {
								allEqual = false;
								break;
							}
							if (confstr[index+l] != noskip[k][l]) {
								allEqual = false;
								break;
							}
						}

						if (allEqual) {

							out = true;

							break;

						}

					}

				}

				return out

			}

		}

	}

	static equal(A,B) {
		return (A.toLowerCase() === B.toLowerCase());
	}

	static removeLastSlash(path) {

		if (path[path.length-1] == "/") {

			return path.substring(0,path.length-1);

		} else {

			return path;

		}

	}

	static remplace(words,a,b) {

		while (words != words.replace(a,b)) {

			words = words.replace(a,b);

		}

		return words;

	}

	static countOccu = (str,word) => (str.length-o.remplace(str,word,"").length)/word.length;

	static getargs(args0) {

		if (typeof(args0) == "string"){

			let args = {};

			args0 = args0.split("&");

			for(let i=0;i<args0.length;i++) {

				args[args0[i].split("=")[0]] = args0[i].split("=")[1];

			}

			return args;

		} else {

			return {};

		}

	}

	static asMIME(file) {
		let conf = o.conf;

		for (let i=0;i<conf.options.length;i++) {

			if ((conf.options[i].recursive == "yes" & o.isInRep(conf.options[i].target,o.getPath(file)))

				| (conf.options[i].recursive == "no" & conf.options[i].target == o.getPath(file))) {

				for (let j=0;j<conf.options[i].options.length;j++) {

					if (o.isInModel(o.getFileName(file),conf.options[i].options[j].file) == true & conf.options[i].options[j].type == "as") {

						return conf.options[i].options[j].val;

					}

				}

			}

		}

		return false;

	}

	static openInstead(target,path) {
		let conf = o.conf;

		if (fs.existsSync(path + target)) {
			return target;
		}
		let folder = OtherFunctions.getPath(target);
		for (let i=0;i<conf.options.length;i++) {
			if ((conf.options[i].recursive == "yes" & o.isInRep(conf.options[i].target,folder))
				| (conf.options[i].recursive == "no" & conf.options[i].target == folder)) {
				let option = conf.options[i];
				let fileName = o.getFileName(target);
				for (let j=0;j<option.options.length;j++) {
					if (option.options[j].type == "openinstead") {
						if (o.isInModel(fileName,option.options[j].file)) {
							return option.options[j].val;
						}
					}
				}
			}
		}
		return target
	}

	static RedirectedTo(target,type) {

		let conf = o.conf;

		if (type == "file") {

			let redirect = o.repRedirectedto(o.getPath(target));

			if (redirect == false) {

				redirect = o.fileRedirectedto(target);

			}

			return redirect;

		} else if (type == "folder") {

			return o.repRedirectedto(o.getPath(target));

		}

	}

	static fileRedirectedto(file) {
		let conf = o.conf;

		for (let i=0;i<conf.options.length;i++) {

			if ((conf.options[i].recursive == "yes" & o.isInRep(conf.options[i].target,o.getPath(file)))

				| (conf.options[i].recursive == "no" & conf.options[i].target == o.getPath(file))) {

				for (let j=0;j<conf.options[i].options.length;j++) {

					if (o.isInModel(o.getFileName(file), conf.options[i].options[j].file) == true & conf.options[i].options[j].type == "redirect") {

						return conf.options[i].options[j].val;

					}

				}

			}

		}

		return false;

	}

	static repRedirectedto(path) {
		let conf = o.conf;

		let out = false;

		let subrep = 0;

		for (let i=0;i<conf.redirect.length;i++) {

			if(o.isInRep(conf.redirect[i].elem,path) == true & o.getNumberSubRep(conf.redirect[i].elem) > subrep) {

				out = conf.redirect[i].redirect;

				subrep = o.getNumberSubRep(conf.redirect[i].elem);

			}

		}

		return out;

	}

	static isAuthorized(target,type) {
		let conf = o.conf;

		if (type == "file") {

			//console.log("repautorized (type file)");

			if (!o.repIsAuthorized(o.getPath(target))) {

				return false;

			}

			if (!o.fileIsAuthorized(target)) {

				return false;

			}

			return true;

		} else if (type == "folder") {

			//console.log("repautorized (type folder)");

			if (!o.repIsAuthorized(target)) {

				return false;

			}

			return true;

		}

	}

	static fileIsAuthorized(file) {

		let conf = o.conf;

		let out = true;

		for (let i=0;i<conf.options.length;i++) {

			if ((conf.options[i].recursive == "yes" & o.isInRep(conf.options[i].target,o.getPath(file)))

				| (conf.options[i].recursive == "no" & conf.options[i].target == o.getPath(file))) {

				//console.log(conf.options[i].recursive + " | " + conf.options[i].target + " => " + getPath(file));

				out = false;

				for (let j=0;j<conf.options[i].options.length;j++) {

					if (o.isInModel(o.getFileName(file),conf.options[i].options[j].file) == true & conf.options[i].options[j].type == "is" & conf.options[i].options[j].val == "allow") {

						out = true;

						j = conf.options[i].options.length;

					}

				}

				if (out == false) {

					out = true;

					for (let j=0;j<conf.options[i].options.length;j++) {

						if (o.isInModel(o.getFileName(file),conf.options[i].options[j].file) == true & conf.options[i].options[j].type == "is" & conf.options[i].options[j].val == "forbidden") {

							out = false;

							j = conf.options[i].options.length;

						}

					}

				}

			}

		}

		return out;

	}

	static repIsAuthorized(path) {

		let conf = o.conf;

		path = o.removeLastSlash(path);

		let param = "forbidden";

		let res = o.repIsInParam(0,param,path);

		while(res.continue) {

			//console.log("repisparam while : " + subrep)

			param = param == "forbidden" ? "allow" : "forbidden";

			res = o.repIsInParam(res.subrep,param,path)

		}

		//console.log("finish : " + param);

		return (param == "forbidden");

	}

	static repIsInParam(subrep,param,path) {

		let conf = o.conf;

		if (typeof(conf[param]) == "undefined") {

			return {continue: false, subrep: 0};

		}

		for (let j=0;j<conf[param].length;j++) {

			if (o.isInRep(conf[param][j],path) == true & o.getNumberSubRep(conf[param][j]) > subrep) {

				//console.log("isinrep(" + conf[param][j] + "," + path + ")")

				return {continue: true, subrep: o.getNumberSubRep(conf[param][j])};

			}

		}

		return {continue: false, subrep: subrep};

	}

	static getNumberSubRep(path) {

		return path.split(o.delimiter).length;

	}

	static canUpload(filename,fastupload) {
		let allow = true;
		for (let i=0;i<fastupload.forbidden.length;i++) {
			if (o.isInModel(filename,fastupload.forbidden[i])) {
				allow = false;
				break;
			}
		}
		if (allow == false) {
			for (let i=0;i<fastupload.allow.length;i++) {
				if (o.isInModel(filename,fastupload.allow[i])) {
					allow = true;
					break;
				}
			}
		}
		return allow;
	}

	static isInModel(name,model) {

		if (model == "*") {

			return true;

		} else if (model.replace("*","") == model) {

			if (name == model) {

				return true;

			} else {

				return false;

			}

		} else if (model[0] == "*" & model[model.length-1] == "*") {

			if (o.remplace(name,o.remplace(model,"*",""),"") != name) {

				return true;

			} else {

				return false;

			}

		} else if (model[0] != "*" & model[model.length-1] == "*") {

			if (name.substring(0,o.remplace(model,"*","").length) == o.remplace(model,"*","")) {

				return true;

			} else {

				return false;

			}

		} else if (model[0] == "*" & model[model.length-1] != "*") {

			if (name.substring(name.length-o.remplace(model,"*","").length,name.length) == o.remplace(model,"*","")) {

				return true;

			} else {

				return false;

			}

		}

	}

	static getFileName(file) {

		return file.split(o.delimiter)[file.split(o.delimiter).length-1];

	}

	static isInRep(rep,inside) {

		let insideSplit = inside !== "" ? o.trim(inside,o.delimiter).split(o.delimiter) : [];
		let repSplit = rep !== "" ? o.trim(rep,o.delimiter).split(o.delimiter) : [];

		if (insideSplit.length < repSplit.length) return false;

		for (let i=0;i<insideSplit.length;i++) {

			if (typeof(repSplit[i]) == "undefined") {
				return true;
			}
			if (insideSplit[i] != repSplit[i]) {
				return false;
			}

		}
		return true;

	}

	static trim(str,char) {
		if (str[0] == char) {
			str = str.substring(1,str.length);
		}
		if (str[str.length-1] == char) {
			str  = str.substring(0,str.length-1);
		}
		return str;
	}

	static getPath(target) {

		let path = "";

		let targetsplit = target.split(o.delimiter);

		for (let i=0;i<targetsplit.length-1;i++) {

			path += targetsplit[i] + o.delimiter;

		}

		path = path.substring(0,path.length-1);

		return path;

	}

	static lenDict(dict) {
		let len = 0;
		for (let key in dict) {
			len += 1;
		}
		return len;
	}

	static logupload(ipsrc,filename,msg,logfile) {

		let date = new Date();

		fs.appendFileSync(logfile,

			(date.getFullYear() + '/' + (date.getMonth()+1) + '/' + date.getDate() + "  " + date.getHours() + ':' + date.getMinutes() + ':' + date.getSeconds() + ' => ' + ipsrc + " => Upload '" + filename + "' : " + msg + "\n"));

	}

	static copyDict(dict) {
		let newDict = {};
		for (let key in dict) {
			newDict[key] = dict[key];
		}
		return newDict;
	}

	ProcessPageInclude(page, PHJSClass,callback, exportVariables) {
		if (page[0] != "/" & page[1]+page[2] != ":\\") {
			page = this.PHJS.cd + o.delimiter + page;
		}
		if (!fs.existsSync(page)) {
			callback(this.PHJS.code,["<font color='red' size='4'>'"+page+"' does not exist</font>\n"]);
		} else {
			if (fs.statSync(page).isDirectory()) {
				callback(this.PHJS.code,["<font color='red' size='4'>'"+page+"' is not a file</font>\n"]);
			} else {
				if (typeof(o.cacheFiles[page]) == "undefined") {
					o.cacheFiles[page] = {file: fs.readFileSync(page, "UTF-8")};

					if (!this.phjsFileToJsFunc(page,exportVariables)) {
						callback(500,null);
						return;
					}
				} else {
					let file = fs.readFileSync(page, "UTF-8");

					if (o.cacheFiles[page].file.length != file.length) {
						o.cacheFiles[page].file = file;
						if (!this.phjsFileToJsFunc(page,exportVariables)) {
							callback(500,null);
							return;
						}
					} else {
						for (let i=0;i<file.length;i++) {
							if (file[i] != o.cacheFiles[page].file[i]) {
								o.cacheFiles[page].file = file;
								if (!this.phjsFileToJsFunc(page,exportVariables)) {
									callback(500,null);
									return;
								}
								break;
							}
						}
					}
					let varsToPass = exportVariables ? this.PHJS.varsToPass : [];
					if (Object.keys(varsToPass).length !== Object.keys(o.cacheFiles[page].varstoPass).length) {
						if (!this.phjsFileToJsFunc(page,exportVariables)) {
							callback(500,null);
							return;
						}
					} else {
						for (let key in varsToPass) {
							if (typeof(o.cacheFiles[page].varstoPass[key]) == "undefined") {
								if (!this.phjsFileToJsFunc(page,exportVariables)) {
									callback(500,null);
									return;
								}
								break;
							}
						}
					}
				}

				let PHJS2 = new PHJSClass(this.PHJS.args,[],this.PHJS.header,this.PHJS.uri,this.PHJS.host,this.PHJS.libs,o.getPath(page),o.getFileName(page),this.PHJS.ipsrc,this.PHJS.session,this.PHJS.varsToPass,this.PHJS.global,this);

				PHJS2.setCallback(function (code,content) {

					callback(code,content);

				});

				try {

					o.cacheFiles[page].func.start(PHJS2.callback,PHJS2); // TRY EXECUTE FILE, PUT RESULT IN 'CONTENT' letIABLE, AND RETURN IT

				} catch(e) {

					this.log(500,'ERROR',"\nExecution error when process '" + page + "' : \n" + this.PHJS.util.format(e));

					callback(500,null);

				}
			}
		}
	}

	phjsFileToJsFunc(page, exportVariables = false) {

		let file = o.cacheFiles[page].file;

		let isphjs = false;

		let htl = [];

		let ht = {};

		let quote = false;

		for (let i=0;i<file.length;i++) { // LOCATE NON PHJS CODE IN THE FILE
			if ((file[i] === "'" || file[i] === "`" || file[i] === '"') && isphjs && file[i-1] !== "\\") {
				if (!quote) {
					quote = file[i];
				} else if (quote === file[i]) {
					quote = false;
				}
			}

			if ((file[i]+file[i+1]+file[i+2]+file[i+3]+file[i+4]+file[i+5] === "<?phjs" || file[i]+file[i+1]+file[i+2] === "<?=") && !quote) {
				if (isphjs) {
					this.log(500,'ERROR',"\nBad '<?phjs ?>' tags in '"+page+"'");
					return false;
				}

				isphjs = true;

				if (typeof(ht.debut) != "undefined") {

					ht.fin = i;

					htl.push(ht);

				}

				ht = {};

				i += file[i]+file[i+1]+file[i+2] === "<?=" ? 2 : 5;

			} else if (file[i]+file[i+1] === "?>" && !quote){
				if (!isphjs) {
					this.log(500,'ERROR',"\nBad '<?phjs ?>' tags in '"+page+"'");
					return false;
				}

				isphjs = false;

				ht.debut = i+2;

				i += 1;

			} else if (i === 0) {

				ht.debut = 0;

			} else if (i === file.length-1) {

				if (!isphjs) {
					ht.fin = file.length;

					htl.push(ht);
				} else if (quote !== false) {
					this.log(500,'ERROR',"\nquotes not finished in '"+page+"'");
					return false;
				}

			}

		}

		let newht;

		let dif = 0;

		for (let i=0;i<htl.length;i++) { // PUT ALL NON PHJS CODE IN 'ECHO' FUNCTION, 'ECHO' FUNCTION IS LIKE 'ECHO' IN PHP, TO GENERATE THE HTML PAGE

			htl[i].debut += dif;

			htl[i].fin += dif;

			newht = file.substring(htl[i].debut,htl[i].fin);

			file = (file.substring(0,htl[i].debut) + "\necho(`" + o.remplace(o.remplace(newht,"`","\\'"),"\\'","\\`") + "`); " + file.substring(htl[i].fin,file.length));

			dif += (("\necho(`" + o.remplace(o.remplace(newht,"`","\\'"),"\\'","\\`") + "`); ").length - newht.length);

		}

		for (let i=0;i<file.length;i++) {
			if (file[i]+file[i+1]+file[i+2] === "<?=") {
				let quote = false;
				let j = i+3;
				while(file[j]+file[j+1] !== "?>" || quote !== false) {
					if ((file[j] === "'" || file[j] === '"' || file[j] === "`") && (file[j-1] !== "\\" || !quote)) {
						if (!quote) {
							quote = file[j];
						} else if (file[j] === quote) {
							quote = false;
						}
					}
					j ++;
				}
				let toDispay = file.substring(i+3,j);
				let indexSoustract = 1;
				while (toDispay[toDispay.length-indexSoustract] === " ") {
					indexSoustract += 1;
				}
				if (toDispay[toDispay.length-indexSoustract] === ';') {
					toDispay = toDispay.substring(0, toDispay.length-indexSoustract);
				}
				file = file.substring(0,i+3)+"\necho("+toDispay+");"+file.substring(j,file.length);
			}
		}

		isphjs = false;
		quote = false;
		let thereIsACallback = false;
		for (let i=0;i<file.length;i++) {
			if (file[i]+file[i+1]+file[i+2]+file[i+3]+file[i+4]+file[i+5] === "<?phjs" || file[i]+file[i+1]+file[i+2] === "<?=" && !quote) {
				file = file.substring(0,i)+file.substring(i + (file[i]+file[i+1]+file[i+2]+file[i+3]+file[i+4]+file[i+5] === "<?phjs" ? 6 : 3));
				isphjs = true;
			} else if (file[i]+file[i+1] === "?>" && !quote) {
				file = file.substring(0,i)+file.substring(i+2);
				isphjs = false;
			} else if (file[i]+file[i+1]+file[i+2]+file[i+3]+file[i+4]+file[i+5]+file[i+6] === "--END--" && !quote && isphjs) {
				file = file.substring(0,i)+"\ncallback(PHJS.code,PHJS.content);\nreturn;"+file.substring(i+7);
				thereIsACallback = true;
			} else if ((file[i] === "'" || file[i] === '"' || file[i] === "`") && isphjs) {
				if (!quote) {
					quote = file[i];
				} else if (file[i] === quote) {
					quote = false;
				}
			}
		}

		if (!thereIsACallback) {
			file += "\ncallback(PHJS.code,PHJS.content);"
		}

		for (let i=0;i<this.PHJSClass.functionInPhjs.length;i++) {
			const func = this.PHJSClass.functionInPhjs[i];
			file = "\nconst "+func+" = PHJS."+func+";\n"+file;
		}

		if (exportVariables) {
			for (let key in this.PHJS.varsToPass) {
				file = "\nconst "+key+" = PHJS.varsToPass."+key+";\n"+file;
			}
		}

		file = "\"use strict\"; function start(callback,PHJS) { \n"+file+" } module.exports = { start: start };"; // PUT FILE IN A FUNCTION FOR EXECUTE HIS JAVASCRIPT CODE

		let func;

		try {

			func = rfs(file); //TRY IMPORT FILE

		} catch(e) {

			this.log(500,'ERROR',"\nSyntax error when process '" + page + "' : \n" + util.format(e));

			return false;

		}

		o.cacheFiles[page].func = func;
		o.cacheFiles[page].varstoPass = {};
		if (exportVariables) {
			for (let key in this.PHJS.varsToPass) {
				o.cacheFiles[page].varstoPass[key] = true;
			}
		}

		return true;
	}

	log(code,type,msg) {

		const date = new Date();

		let dst;

		const logfile = o.equal(type,"info") ? o.logaccess : o.logerror;

		dst = o.proto + "://" + this.req.headers.host + url.parse(this.req.url).pathname;

		if (this.req.method == "GET" & url.parse(this.req.url).query != null) {

			dst = dst + "?" + url.parse(this.req.url).query;

		}

		const year = o.addMissingZero(date.getFullYear()),
			month = o.addMissingZero(date.getMonth()+1),
			day = o.addMissingZero(date.getDate()),
			hour = o.addMissingZero(date.getHours()),
			minute = o.addMissingZero(date.getMinutes()),
			second = o.addMissingZero(date.getSeconds());

		fs.appendFileSync(logfile,

			(year + '-' + month + '-' + day + "  " + hour + ':' + minute + ':' + second + ' => ' + this.ipsrc + ' => ' + this.req.method + ' ' + dst + ' CODE ' + code + ' ; ' + this.req.headers['user-agent'] + ' ' + msg + '\n'));

	}

	static addMissingZero(val, length = 2) {
		val = val.toString();
		while (val.length < length) {
			val = "0"+val;
		}
		return val;
	}

}

let o = OtherFunctions;

module.exports = OtherFunctions;
