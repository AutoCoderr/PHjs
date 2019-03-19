const include = (page,callback) => {
	ProcessPageInclude(page,PHJS, (content,code) => {
		if (code >= 200 & code < 300) {
			for (var i=0;i<content.length;i++) {
				PHJS.content.push(content[i]);
			}
		} else if (code<500 | code >= 600) {
			log(500,'ERROR',"INVALID HTTP CODE\n");
			PHJS.content.push({type: "html", chaine: "<font color='red' size='4'>Error 500 in '"+page+"'</font><br/>\n"});
		} else {
			PHJS.content.push({type: "html", chaine: "<font color='red' size='4'>Error "+code+" in '"+page+"'</font><br/>\n"});
		}
		content = undefined;
		if (typeof(callback) == "function") {
			callback();
		}
	});
}

const global_destroy = () => {
	for (var key in PHJS.global) {
		delete PHJS.global[key];
	}
}

const session_destroy = () => {
	for (var key in PHJS.session) {
		delete PHJS.session[key];
	}
}

const setCode = (code) => {
	PHJS.code = code;
}

const errorLog = (e) => {
	PHJS.log(500,'ERROR',"\nError when process '"+PHJS.cd+"/"+PHJS.fileName+"' : \n"+PHJS.util.format(e))
}

module.exports = {
	include: include,
	global_destroy: global_destroy,
	session_destroy: session_destroy,
	setCode: setCode,
	errorLog
};