!(function() {

	var mtm = { version: "2.3.3" };
	var verbose=false;

	//VARIABLES//
	//this product includes color specifications and designs developed by Cynthia Brewer (http://colorbrewer.org/).
	var colorbrewer = {Set3: { 12: ["#8dd3c7","#ffffb3","#bebada","#fb8072","#80b1d3","#fdb462","#b3de69","#fccde5","#d9d9d9","#bc80bd","#ccebc5","#ffed6f"]
	}};
	
	//need to compute json
	//functions merge, completeTree, relatives, sumHits
	var ranks = ["no rank","superkingdom","kingdom","subkingdom","superphylum","phylum","subphylum","superclass","class","subclass","infraclass","superorder","order","suborder","infraorder","parvorder","superfamily","family","subfamily","tribe","subtribe","genus","subgenus","species group","species subgroup","species","subspecies","varietas","forma"];
	var config; //object configuration
	var root; //object root (all tree)
	var bkeys, //list of keys for bridges
	bobjs; //list of node -object- for bridge
	
	//neet to initiate layout
	//functions setLayout, computeLayout
	var node; //current node displayed
	var sorted; //taxa names for search
	var d3layout; //d3 layout
	var color=""; //color set for leaves
	
	//need to update
	var w=1,h=1; //map dimentions
	var x,y; //d3 scales
	var kx=1,ky=1; //zoom ratio
	var touched=""; //node for touch event
	
	//CONSTRUCTORS//
	mtm.load = function(files,conf) {
if(verbose){console.time("load");}
		//root init.
		root={"name":"root","children":[],"data":{"hits":0,"rank":"no rank","sample":0},"id":"1"}; //skeleton tree
		bkeys = [root.id]; //list of keys of nodes
		bobjs = [root]; //list of node -object-
		
		//loading config file
		if(conf) { d3.json(URL.createObjectURL(conf),function(c) {config=c;}); }
		else if (!config) { d3.json("./mtm-config.json",function(c) {config=c;});}
		
		//Loading input files
		var queue = files.length; //counter
		var hundreds = []; //samples total reads
		for (var i=0; i < files.length; i++) {
			d3.json(files[i], function(di) {
				hundreds[(i-queue+1)]=+di.data.sum;
				merge(di,"",(i-queue+1),hundreds); //Create skeleton and leaves (root,parent,sample)
				if(!--queue) {
					hundreds[0]= hundreds.reduce(function(a,b) {return a + b;});
if(verbose){console.time("completeTree");}
					completeTree(root,hundreds); //Add 1 node by rank + sum hits
if(verbose){console.timeEnd("completeTree");}
					setLayout();
				} 
			});
		}
if(verbose){console.timeEnd("load");}
	}   
	
	mtm.save = function(mode) {
		//delete previous
		d3.select("#mtm-canvas").html("");
		
		if(mode=="json") {
			copy(root); //format tree for output
			//create file
			var url = 'data:text/json;charset=utf8;filename=output.json,' + encodeURIComponent(JSON.stringify(out));
			//Direct DownLoad call
			ddl("merge.json",url);
		}
		else if(mode=="svg") {
			var svg = d3.select("svg");		
			//add svg header
			var html = d3.select("svg")
				.attr("version", 1.1)
				.attr("xmlns", "http://www.w3.org/2000/svg")
				.node().parentNode.innerHTML;
				
			var url = 'data:image/svg+xml;charset=utf8;filename=treemap.svg,' + encodeURIComponent(html);
			//Direct DownLoad call
			ddl("treemap.svg",url);
		}
		else if(mode=="png") {
			var svg = d3.select("svg");		
			//create canvas
			var canvas = d3.select("body").append("canvas")
				.attr("width",svg.attr("width"))
				.attr("height",svg.attr("height"))
				.style("display","none")
				.node();
			var context = canvas.getContext("2d");
			
			//add svg header
			var html = svg.attr("version", 1.1)
				.attr("xmlns", "http://www.w3.org/2000/svg")
				.attr(":xmlns:xlink","http://www.w3.org/1999/xlink")
				.node().outerHTML;
				
			//img tag
			var image = new Image;
			image.onload = function() {
				//create file
				context.drawImage(image, 0, 0);
				var url = canvas.toDataURL().replace("image/png","application/octet-stream");
				//Direct DownLoad call
				ddl("treemap.png",url);
			};
			image.src = 'data:image/svg+xml;base64,'+ btoa(html);
		}
		else if(mode=="txt") {
			//header
			var string =  "Name\tTaxonomyID\tHits\tPercentage\tSample\tRank\n";
			//concatenate data 
			string = string + exportTab(root);
			//create file
			var url = 'data:text/tab-separated-values;charset=utf8;filename=table.txt,' + encodeURIComponent(string);
			//Direct DownLoad call
			ddl("table.txt",url);
		}
		else if(mode=="config") {
			//create file
			var url = 'data:text/json;charset=utf8;filename=mtm-config.json,' + encodeURIComponent(JSON.stringify(config));
			//Direct DownLoad call
			ddl("mtm-config.json",url);
		}
	}
	
	mtm.convertor = function(location) {
		//CONTAINER//
		var container = d3.select("#"+location) //container div
			.append("table");
		/*Upload data files (.json): <input type="file" name="dataFiles[]" id="data" multiple/>*/
		var row = container.append("tr");
		row.append("td")
			.text("Other.json")
			.append("input")
			.attr("type","radio")
			.attr("name","mtm-format")
			.attr("value","json")
			.property('checked', true)
			.on("click",function(){format(this);})
		row.append("td")
			.text("[OR] Tabular.txt")
			.append("input")
			.attr("type","radio")
			.attr("name","mtm-format")
			.attr("value","tab")
			.on("click",function(){format(this);})
		row = container.append("tr");
		row.append("td")
			.text("data file:")
		row.append("td")
			.append("input")
			.attr("type","file")
			.attr("name","mtm-convertFile")
			.attr("id","mtm-convert")
			.style("width","155px")
		row = container.append("tr");
		row.append("th")
			.text("Fields")
		row.append("th")
			.attr("id","mtm-fieldhead")
			.text("Object property")
		row = container.append("tr");
		row.append("td")
			.text("Taxon id:")
		row.append("td")
			.append("input")
			.attr("type","text")
			.attr("name","mtm-tid")
			.attr("value","id")
		row = container.append("tr");
		row.append("td")
			.text("Taxon name:")
		row.append("td")
			.append("input")
			.attr("type","text")
			.attr("name","mtm-tname")
			.attr("value","name")
		row = container.append("tr");
		row.append("td")
			.text("Hits:")
		row.append("td")
			.append("input")
			.attr("type","text")
			.attr("name","mtm-hits")
			.attr("value","data.assigned")
		row = container.append("tr")
			.attr("id","mtm-headrow")
			.style("display","none");
		row.append("td")
			.attr("colspan","2")
			.text("Ignore 1st line (header)")
			.append("input")
			.attr("type","checkbox")
			.attr("name","mtm-head")
			.attr("value","false")
		row = container.append("tr")
		row.append("td")
			.attr("colspan","2")
			.append("input")
			.attr("type","button")
			.attr("name","convert")
			.attr("value","Convert")
			.on("click",function(){convert();})
	}
	
	//SUB FUNCTIONS//
	//DATA STRUCTURE//
	function merge(n,p,s,h) {
		//Create skeleton tree and leaves with assigned hits
		//avoid space in id
		n.id = (""+n.id).replace(/\s+/g, '_');
		//avoid no rank
		if(n.data.rank=="no rank" && p != ""){ n.data.rank=p.data.rank;}
		
		//update skeleton
		var nsk; //skeleton node of n
		var idx = bkeys.indexOf(n.id);
		if(idx > -1) { // if node exist
			nsk=bobjs[idx]; //existing node
			
			//New branch is deeper, need rebase
			if(p!="" && ranks.indexOf(p.data.rank) > ranks.indexOf(nsk.parent.data.rank)) {
				//disconnect skeleton
				nsk.parent.children.splice(
					nsk.parent.children.indexOf(nsk),1
				);
				
				//connect with deeper
				var psk = bobjs[bkeys.indexOf(p.id)];
				psk.children.push(nsk);
			}
		}
		else { //else new skeleton node
			var psk=bobjs[bkeys.indexOf(p.id)];
			nsk = {"name":n.name,
				"children":[],
				"parent":psk,
				"data":{"hits":0,"rank":n.data.rank,"sample":0},
				"id":n.id
			};	
			psk.children.push(nsk);
			bkeys.push(nsk.id);
			bobjs.push(nsk);
		}
		
		//Add tag node
		if(n.data.assigned!="0"){
			var tag={"name":n.name,
				"children":[],
				"data":{"hits":+n.data.assigned,
					"rank":n.data.rank,
					"sample":s,
					"percent":+n.data.assigned*100/h[s]},
				"id":n.id
			}

			if (n.children.length>0) {tag.name+="*";}
			nsk.children.push(tag);
		}
		
		//recursive call
		if (n.children.length>0) {
			for (var i in n.children) {
				merge(n.children[i],n,s,h);
			}
		}
	}
	
	function completeTree(n,h) { 
		//walk through the input tree from root to leaves
		//complete tree: 1 node by rank
		//Sum hits in subtree
		//recursive call
		if (n.children.length>0) {
			var adds=[]; //list of bridges path
			for (var i in n.children) {
				var hits=completeTree(n.children[i],h);
				n.data.hits=+n.data.hits+hits;
				n.data.percent=+n.data.hits*100/h[n.data.sample];
				//complete the tree (one node by phylogeny rank)
				adds.push(relatives(n,n.children[i],h));
			}
			
			//manage edges to bridges
			adds.forEach(function(add) {
				//disconnect parent and child
				add[0].children.splice(
					add[0].children.indexOf(add[1]),1
				);
				//connect parent and medium
				if(add.length==3) {	
					add[0].children.push(add[2]);
				}
			})
		}		
		//for sum hits in subtree
		return n.data.hits;
	}
	
	function relatives(parent,child,h) {
		//add missing node between two : parent -- medium -- child
		var firstChild=child;
		var prank=ranks.indexOf(parent.data.rank);
		var crank=ranks.indexOf(child.data.rank);
		//delta between child rank and parent rank
		var r = crank - prank;
		//for each missing level
		for(r;r>1;r--) {
			var mrank=prank+r-1;
			var mid=parent.id+"_"+mrank;
			
			//test if medium already exist
			var idx = bkeys.indexOf(mid);
			if(idx > -1) { //medium exist
				medium = bobjs[idx];
				//sum child hits to ancestor
				sumHits(parent.id,mrank-1,+child.data.hits,r-1,h);
				r=0; //break loop for missing node
			}
			else { //medium do not exist
				var medium={
					name: ranks[mrank]+" under "+parent.name,
					children: [],
					data: {hits:0, rank:ranks[mrank], sample:0},
					id: mid
				};
				bkeys.push(mid);
				bobjs.push(medium);
			}
			
			//connect child and medium
			medium.children.push(child);
			//sum child hits to medium
			medium.data.hits = +medium.data.hits + +child.data.hits;
			medium.data.percent=+medium.data.hits*100/h[0]

			//loop
			child=medium;
		}
		
		if(r==1) { return [parent,firstChild,child];} //new path
		else if(r==0) { return [parent,firstChild,child]; } // parent-child
		else if(r==-1) { return [parent,firstChild]; } //path already exist
		else { //WARNING:
			console.log("WARNING rank:",r,parent.name,firstChild.name,child.name);
		}
	}
	
	function sumHits(pid,mrank,sum,r,h) {
		//sum hits to ancestor - recursive call
		var mid=pid+"_"+mrank;
		var idx = bkeys.indexOf(mid);
		if(idx>-1) { 
			var m = bobjs[idx];
			m.data.hits = +m.data.hits + sum;
			m.data.percent=+m.data.hits*100/h[m.data.sample];
			if(r>2) { sumHits(pid,mrank-1,sum,r-1,h); }
		}
	}
	
	//VIEW CREATION//
	function setLayout() {
if(verbose){console.time("layout");}
		node=root;
		
		//style
		d3.select("head").append("style").text(
		"#mtm-tip{position:absolute;z-index:10;background-color:#888;border:1px solid #000;border-radius:.2em;padding:3px;font-family:'Source Code Pro','Lucida Console',Monaco,monospace;font-size:14pt;pointer-events:none;opacity:0}\n"
		+".mtm-button{background-color:#fff;border-radius:.2em;margin:1px;padding:2px ;font-size:14pt;cursor:pointer;display:inline-table;}\n"
		+".mtm-on{color:#000;border:3px solid #000;}\n"
		+".mtm-off{color:#888;border:3px solid #888;}\n"
		+".mtm-searchbox{position:absolute;background-color:#888;border:1px solid #fff;border-radius:.2em;}\n"
		+".mtm-searchbox:hover{border: 1px solid black;}\n"
		+".mtm-searchbox ul{margin:0px;padding:0px 5px;}\n"
		+".mtm-searchbox ul li {list-style-type:none;list-style-position:outside;}\n"
		+".mtm-searchbox ul li:hover{background-color:#666;cursor:pointer;}\n"
		+"#mtm-table table{border-collapse:collapse;width:100%;}\n"
		);
		
		//set color palette
		if(color==""){ color = d3.scale.ordinal().range(colorbrewer.Set3[12]); }
		
		//hidden div
		d3.select("body").append("div").attr("id","mtm-tip");
		d3.select("body").append("div").attr("id","mtm-canvas").style("display","none");

		//Delete previous views
		d3.selectAll(".mtm-container").html("");
		param={};
		
		//build d3.layout
		computeLayout();
		//sort nodes for search
		sorted = d3layout.nodes().slice(0); //clone
		sorted.sort(function(a,b) { return a.name.length<b.name.length ? -1 : a.name.length>b.name.length ? 1 : a.name<b.name ? -1 : a.name>b.name ? 1 : 0  ; });
		
		//build views
		if(config.bar) { bar(config.bar); }
		if(config.configuration && config.configuration.display) {
			configuration(config.configuration);
		}
		if(config.table && config.table.display) {
			param.table={};
			table(config.table,param.table);
		}
		if(config.treemap && config.treemap.display) {
			param.treemap={};
			treemap(config.treemap,param.treemap);
		}

		//update
		updateColor();
		updateLabel();
		zoom(node);

if(verbose){console.timeEnd("layout");}
	}
	
	function computeLayout() {
		if(config.treemap.display) {
			h = config.treemap.height - 20;  //margin top
			w = config.treemap.width - 1; //margin left
		}

		//compute final json tree
		d3layout = d3.layout.treemap() //array of all nodes
			.size([w, h]) //size of map
			.round(false) //round the value (for scale)
			.sticky(true) //keep child position when transform
			.value(setMode(config.options.mode));
		var nodes = d3layout.nodes(root);
		
		//scale from data to map
		x = d3.scale.linear().range([0, w]);
		y = d3.scale.linear().range([0, h]);
		
if(verbose){console.log("nodes",nodes.length,"leaves",nodes.filter(function(d){return !d.children;}).length,"root.value",root.value);}
	}
	
	function setMode(confMode) {
		var mode;
		if(confMode=="norm") { mode=sizeNorm; }
		else if(confMode=="hits") { mode=sizeHits; }
		else if(confMode=="nodes") { mode=sizeNodes;}
		else {console.log("ERROR: unvalide size mode"); mode=sizeNorm; }
		return mode;
	}
	
	function sizeNorm(d) { return d.data.percent; }
	function sizeHits(d) { return d.data.hits; } 
	function sizeNodes(d) { return 1; }

	//LAYOUTS//
	function bar(c,location,width) {
if(verbose){console.time("bar");}
		//create menu bar//
		var menu;
		if(location) {
			menu = d3.select("#"+location)
				.classed("mtm-container",true)
				.append("div")
				.classed("mtm-menu",true)
				.style("width",width+"px");
		}
		else if(c.display) {
			menu = d3.select("#"+c.location)
				.classed("mtm-container",true)
				.append("div")
				.classed("mtm-menu",true)
				.style("width",c.width+"px");
		}
		else { 
			menu = d3.select("body")
				.append("div")
				.classed("mtm-menu",true)
				.style("display","none")
		}
		
		//Color By//
		var s = menu.append("span").attr("class","mtm-button mtm-on")
			.append("span").attr("class","fa fa-link")
			.attr("title","Color by...")
			.append("select").attr("class","mtm-color")
			//options//
			s.append("option").attr("value","taxon").text("by taxon");
			s.append("option").attr("value","rank").text("by rank");
			s.append("option").attr("value","sample").text("by sample");
			s.append("option").attr("value","max").text("majority");
			//value//
			s.property("value",config.options.color)
			s.on("change",function() { 
				//change all button
				config.options.color=this.value;
				d3.selectAll(".mtm-color").property('value',this.value);
				d3.select("#options_color").property('value',this.value);
				//action
				updateColor();
			});
		
		//Phylogenic Rank//
		var s = menu.append("span").attr("class","mtm-button mtm-on")
			.append("select").attr("class","mtm-phylogeny");
			//options//
			s.append("option").attr("value","init").text("--Phylogenic rank--");
			for (var k in ranks) {
				s.append("option").attr("value",ranks[k]).text(ranks[k]);
			}
			//value//
			s.property("value",config.options.rank)
			s.on("change",function() {
				//change all button
				config.options.rank=this.value;
				d3.selectAll(".mtm-phylogeny").property('value',this.value);
				d3.select("#options_rank").property('value',this.value);
				//action
//console.log(config.options.rank,config.options.color,config.options.label);
				if(config.options.color=="rank") { updateColor(); }
				if(config.options.label=="rank") {
					updateLabel();
					zoom(node);
				}
			});
		
		//Labels//
		menu.append("span").attr("class","mtm-button fa fa-tag mtm-label")
			.attr("title","Labelling leaves or ranks")
			.classed("mtm-on",function() { return config.options.label=="taxon"; })
			.classed("mtm-off",function() { return config.options.label=="rank"; })
			.on("click", function() {
				config.options.label=config.options.label=="taxon"?"rank":"taxon";
				d3.selectAll(".mtm-label")
					.classed("mtm-on",function() { return config.options.label=="taxon"; })
					.classed("mtm-off",function() { return config.options.label=="rank"; })
				d3.select("#options_label").property('value',config.options.label);
				updateLabel();
				zoom(node);
			});
		
		//Parents//	
		menu.append("span").attr("class","mtm-button fa fa-sitemap mtm-upper")
			.attr("title","Grayed or colored upper ranks")
			.classed("mtm-on",function() { return config.options.upper=="color"; })
			.classed("mtm-off",function() { return config.options.upper=="gray"; })
			.on("click", function() {
				config.options.upper=config.options.upper=="color"?"gray":"color";
				d3.selectAll(".mtm-upper")
					.classed("mtm-on",function() { return config.options.upper=="color"; })
					.classed("mtm-off",function() { return config.options.upper=="gray"; })
				d3.select("#options_upper").property('value',config.options.upper);
				updateColor();
			});
			
		//Home//
		menu.append("span").attr("class","mtm-button fa fa-home mtm-root")
			.attr("title","Back to root")
			.classed("mtm-on",true)
			.on("click", function() { 
				d3.selectAll(".mtm-root").classed("mtm-on",true);
				zoom(root);
			});
		
		//Font//
		var s = menu.append("span").attr("class","mtm-button mtm-on")
			.append("span").attr("class","fa fa-text-height")
			.attr("title","Font size")
			.append("select").attr("class","mtm-font")
			//options//
			for (var i=8; i<40; i=i+2) {
				s.append("option").attr("value",i).text(i);
			}
			//value//
			s.property("value",config.options.font)
			s.on("change",function() { 
				//change all button
				config.options.font=this.value;
				d3.selectAll(".mtm-font").property('value',this.value);
				d3.select("#options_font").property('value',this.value);
				//action
				updateLabel();
				zoom(node);
			});

		//Palette//
		menu.append("span").attr("class","mtm-button fa fa-eyedropper mtm-palette")
			.attr("title","Switch from 12 to 20 colors")
			.classed("mtm-on",function() { return config.options.palette=="12"; })
			.classed("mtm-off",function() { return config.options.palette=="20"; })
			.on("click", function() {
				config.options.palette=config.options.palette=="20"?"12":"20";
				d3.selectAll(".mtm-palette")
					.classed("mtm-on",function() { return config.options.palette=="12"; })
					.classed("mtm-off",function() { return config.options.palette=="20"; })
				d3.select("#options_palette").property('value',config.options.palette);
				//action
				color=config.options.palette=="20"?d3.scale.category20c():d3.scale.ordinal().range(colorbrewer.Set3[12]);
				updateColor();
			});	
			
		//Background//
		menu.append("span").attr("class","mtm-button fa fa-adjust mtm-background")
			.attr("title","Background black or white")
			.classed("mtm-on",function() { return config.options.background=="black"; })
			.classed("mtm-off",function() { return config.options.background=="white"; })
			.on("click", function() {
				config.options.background=config.options.background=="black"?"white":"black";
				d3.selectAll(".mtm-background")
					.classed("mtm-on",function() { return config.options.background=="black"; })
					.classed("mtm-off",function() { return config.options.background=="white"; })
				d3.select("#options_background").property('value',config.options.background);
				//action
				d3.selectAll(".mtm-bg").attr("fill",config.options.background);
				d3.selectAll(".mtm-header rect").style("stroke",config.options.background);
				d3.select("#mtm-table").style("background-color",config.options.background);
			});
			
		//Mode//
		var s = menu.append("span").attr("class","mtm-button mtm-on")
			.append("span").attr("class","fa fa-th")
			.attr("title","Size mode")
			.append("select").attr("class","mtm-mode")
			//options//
			s.append("option").attr("value","norm").text("norm");
			s.append("option").attr("value","hits").text("hits");
			s.append("option").attr("value","nodes").text("nodes");
			//value//
			s.property("value",config.options.mode)
			s.on("change",function() { 
				//change all button
				config.options.mode=this.value;
				d3.selectAll(".mtm-mode").property('value',this.value);
				d3.select("#options_mode").property('value',this.value);
				//action
				d3layout.value(setMode(config.options.mode));
				d3layout.nodes(root);
				zoom(node);
			});
		
		//Search bar//
		var s = menu.append("span").attr("class","mtm-button mtm-on")
			.append("span").attr("class","fa fa-search")
			.attr("title","Search a taxon")
		s.append("input").attr("type","text")
			.attr("class","mtm-search")
			.attr("size","17")
			.on("keyup",function() {
				var word = this.value;
				var matches=[];
				var i=0;
				//build regext with input
				regexp = new RegExp(word,'i');
				//search 10 first results (sort by length & alpha)
				while(i<sorted.length && matches.length<10) {
					if(regexp.test(sorted[i].name)) {
						matches.push(sorted[i]);
					}
					i++;
				}
				//update list of options
				d3.selectAll('.mtm-searchbox').select('ul')
					.selectAll("li").remove()
				d3.selectAll('.mtm-searchbox').select('ul')
					.selectAll("li")
					.data(matches)
					.enter().append("li")
					.on("click",function(d) {
						d3.selectAll(".mtm-search").property("value",d.name);
						d3.selectAll('.mtm-searchbox').select('ul')
							.selectAll("li").remove()
						tip("hide",d);
						zoomSkip(d); 
					})
					.on('mouseover', function(d){ tip("show",d); })
					.on('mouseout', function(d){ tip("hide",d); })
					.on("mousemove", function(d) { tip("move"); })
					.text(function(d){ return d.name; }) 
			})
		s.append("div").attr("class","mtm-searchbox")
			.append("ul");

if(verbose){console.timeEnd("bar");}
		return menu.node().offsetHeight;
	}
	
	function configuration(c) {
if(verbose){console.time("config");}
		var loc = d3.select("#"+c.location).classed("mtm-container",true);
		for (var i in config) {
			var part=loc.append("div").style("display","inline-block").style("vertical-align","top").append("table")
			part.append("tr").append("th").attr("colspan",2).text(i)
			if(config[i].hasOwnProperty("display")) {
				var row = part.append("tr")
				row.append("td").text("display")
				var e = row.append("td").append("input").attr("type","checkbox").attr("id",i+"_display").on("change",function(){return configChange(this);});
				if(config[i].display) {e.property("checked",true);}
			}
			if(config[i].hasOwnProperty("location")) {
				var row = part.append("tr")
				row.append("td").text("location")
				var e = row.append("td").append("input").attr("type","text").attr("id",i+"_location").style("width","120px").on("change",function(){return configChange(this);});
				e.attr("value",config[i].location);
			}
			if(config[i].hasOwnProperty("width")) {
				var row = part.append("tr")
				row.append("td").text("width")
				var e = row.append("td").append("input").attr("type","number").attr("id",i+"_width").style("width","64px").on("change",function(){return configChange(this);});
				e.attr("value",config[i].width);
			}
			if(config[i].hasOwnProperty("height")) {
				var row = part.append("tr")
				row.append("td").text("height")
				var e = row.append("td").append("input").attr("type","number").attr("id",i+"_height").style("width","64px").on("change",function(){return configChange(this);});
				e.attr("value",config[i].height);
			}
			if(config[i].hasOwnProperty("options")) {
				var row = part.append("tr")
				row.append("td").text("options")
				var e = row.append("td").append("input").attr("type","checkbox").attr("id",i+"_options").on("change",function(){return configChange(this);});
				if(config[i].options) {e.property("checked",true);}
			}
			//options//
			if(config[i].hasOwnProperty("color")) {
				var row = part.append("tr")
				row.append("td").text("color by")
				var e = row.append("td").append("select").attr("id",i+"_color").style("width","70px").on("change",function(){return configChange(this);});
				e.append("option").attr("value","taxon").text("taxon");
				e.append("option").attr("value","rank").text("rank");
				e.append("option").attr("value","sample").text("sample");
				e.append("option").attr("value","max").text("majority");
				e.node().value=config[i].color;
			}
			if(config[i].hasOwnProperty("rank")) {
				var row = part.append("tr")
				row.append("td").text("rank")
				var e = row.append("td").append("select").attr("id",i+"_rank").on("change",function(){return configChange(this);});
				e.append("option").attr("value","null").text("--empty--");
				for (var k in ranks) { e.append("option").attr("value",ranks[k]).text(ranks[k]);}
				e.node().value=config[i].rank;
			}
			if(config[i].hasOwnProperty("label")) {
				var row = part.append("tr")
				row.append("td").text("labeling")
				var e = row.append("td").append("select").attr("id",i+"_label").style("width","70px").on("change",function(){return configChange(this);});
				e.append("option").attr("value","taxon").text("taxon");
				e.append("option").attr("value","rank").text("rank");
				//e.append("option").attr("value","none").text("none");
				e.node().value=config[i].label;
			}
			if(config[i].hasOwnProperty("upper")) {
				var row = part.append("tr")
				row.append("td").text("upper")
				var e = row.append("td").append("select").attr("id",i+"_upper").style("width","70px").on("change",function(){return configChange(this);});
				e.append("option").attr("value","color").text("color");
				e.append("option").attr("value","gray").text("gray");
				e.node().value=config[i].label;
			}
			if(config[i].hasOwnProperty("font")) {
				var row = part.append("tr")
				row.append("td").text("font")
				var e = row.append("td").append("select").attr("id",i+"_font").style("width","70px").on("change",function(){return configChange(this);});
				for (var j=8; j<40; j=j+2) {
					e.append("option").attr("value",j).text(j);
				}
				e.node().value=config[i].font;
			}
			if(config[i].hasOwnProperty("palette")) {
				var row = part.append("tr")
				row.append("td").text("palette")
				var e = row.append("td").append("select").attr("id",i+"_palette").style("width","70px").on("change",function(){return configChange(this);});
				e.append("option").attr("value","12").text("12");
				e.append("option").attr("value","20").text("20");
				e.node().value=config[i].palette;
			}
			if(config[i].hasOwnProperty("background")) {
				var row = part.append("tr")
				row.append("td").text("background")
				var e = row.append("td").append("select").attr("id",i+"_background").style("width","70px").on("change",function(){return configChange(this);});
				e.append("option").attr("value","black").text("black");
				e.append("option").attr("value","white").text("white");
				e.node().value=config[i].background;
			}
			if(config[i].hasOwnProperty("mode")) {
				var row = part.append("tr")
				row.append("td").text("mode")
				var e = row.append("td").append("select").attr("id",i+"_mode").style("width","70px").on("change",function(){return configChange(this);});
				e.append("option").attr("value","norm").text("norm");
				e.append("option").attr("value","hits").text("hits");
				e.append("option").attr("value","nodes").text("nodes");
				e.node().value=config[i].mode;
			}
			if(config[i].hasOwnProperty("pattern")) {
				var row = part.append("tr")
				row.append("td").text("pattern")
				var e = row.append("td").append("input").attr("type","text").attr("id",i+"_pattern").style("width","120px").on("change",function(){return configChange(this);});
				e.attr("value",config[i].pattern);
			}
		}
		loc.append("div").style("display","inline-block").style("vertical-align","top").append("p").html("<b>Pattern keys</b><br/>#N: name<br/>#I: id<br/>#H: hits<br/>#R: rank<br/>#S: sample<br/>#P: % by sample<br/>#V: % by view").style("margin","0px");
		loc.append("input").attr("type","button").attr("value","Update view").on("click",function(){return setLayout();});

if(verbose){console.timeEnd("config");}
	}
	
	function treemap(c,p) {
if(verbose){console.time("treemap");}
		//CONTAINER//
		//create container div//
		var container = d3.select("#"+c.location) //container div
			.classed("mtm-container",true)
			
		//Menu//
		if(c.options) {
			bar(config.bar,c.location,c.width);
		}
		
		//SVG//
		var svg = container.append("svg") //general SVG
				.attr("id","mtm-treemap")
				.attr("height", c.height)
				.attr("width", c.width)
				.style("display","inline-block")//disable bottom padding
		
		//backgroung
		svg.append("rect")
			.attr("width","100%")
			.attr("height","100%")
			.attr("fill","#000")
			.attr("class","mtm-bg");
		
		//group for visual elements
		var view = svg.append("g")
			.attr("transform", "translate(1,20)") //margin left, top
			.classed("mtm-view",true)
		
		//visual elements
		var leaves = d3layout.nodes().filter(function(d) { return !d.children; });
		view.datum(root).selectAll("rect")
			.data(leaves)
			.enter().append("rect")
			.attr("class",function(d){ return "v"+d.id+"-"+d.data.sample;},true)
			.on("click", function(d) {
				if(touched=="") {//mouse click or 2nd touch
					highlight(d,false);
					tip("hide",d);
					zoomSkip(d);
				}
			})
			.on('mouseover', function(d){
					highlight(d,true);
					tip("show",d);
				})
			.on('mouseout', function(d){
					highlight(d,false);
					tip("hide",d);
				})
			.on("mousemove", function(d) { tip("move"); })
			.on("touchstart", handleTouch)
			
			
		//group for labels//
		svg.append("g")
			.attr("transform", "translate(1,20)") //margin left, top
			.classed("mtm-labels",true)
			.style("font-family","'Source Code Pro','Lucida Console',Monaco,monospace");			
			
		//group for header (current zoom)//
		var header = svg.append("g")
			.attr("transform", "translate(1,20)") //margin left, top
			.classed("mtm-header",true)
		//create visual element rect
		header.append("rect")
			.datum(node)
			.attr("y", -20) //child of root g, moved on margin.top
			.attr("width", c.width - 1)
			.attr("height", 20-1) //border-bottom
			.style("fill","#888").style("stroke","black")
			.on('mouseover', function(d){ tip("show",d); })
			.on('mouseout', function(d){ tip("hide",d); })
			.on("touchstart", handleTouch)
			.on("mousemove", function(d) { tip("move"); })
		//create text element
		header.append("text")
			.attr("x", 6)
			.attr("y", -18)
			.attr("dy", ".75em")
			.style("font-family","'Source Code Pro','Lucida Console',Monaco,monospace")
			.text("Please load json file");

		//rect for highlight//
		svg.append("rect")
			.classed("mtm-hl",true)
			.style("stroke","#000")
			.style("stroke-width","5")
			.style("fill","none")
			.style("pointer-events","none");
if(verbose){console.timeEnd("treemap");}
	}
	
	function table(c,p) {
if(verbose){console.time("table");}		
		var container = d3.select("#"+c.location) //container div
			.classed("mtm-container",true)
		
		//Menu//
		if(c.options) {
			bar(config.bar,c.location,c.width);
		}
		
		//table//
		var tab=container.append("div")
				.attr("id","mtm-table")
				.style("height", c.height)
				.attr("width", c.width)
				.style("overflow","auto")
				.style("background-color","#000")
				.style("display","inline-block")
				.style("font-family","'Source Code Pro','Lucida Console',Monaco,monospace")
				.style("font-size","14px")
				
		//thead
		var thead = tab.append("div")
			.style("background-color","#888")
			.append("table")
			.append("tr")
			.classed("mtm-header",true);
		thead.append("th").text("Node");
		thead.append("th").style("width","70px").style("text-align","right").text("Taxon_ID");
		thead.append("th").style("width","60px").style("text-align","right").text("Hits");
		thead.append("th").style("width","60px").style("text-align","right").text("%/View");
		thead.append("th").style("width","80px").style("text-align","right").html("%/Sample&nbsp;");
		thead.append("th").style("width","130px").style("text-align","left").text("Rank");
		thead.append("th").style("width","15px").text("");//scroll bar

		//tbody
		var view = tab.append("div")
			.style("height",(c.height-thead.node().offsetHeight)+"px")
			.style("width", c.width+"px")
			.style("overflow","auto")
			.attr("class","mtm-scrollable")
			.append("table")
			.classed("mtm-view",true)
			.classed("mtm-labels",true)
			.style("table-layout","fixed")

		//Fill table
if(verbose){console.time("growTable");}
		//var hundread = root.data.hits;
		var nodes = d3layout.nodes();
		
		//create tr and td
		view.selectAll("tr").data(nodes).enter().append("tr")
				.attr("class",function(d){return "v"+d.id+"-"+d.data.sample;})
				.on("mouseover",function(d) { 
					highlight(d,true);
					tip("show",d);
				})
				.on("mouseout",function(d) {
					highlight(d,false);
					tip("hide",d);
				})
				.on("mousemove", function(d) { tip("move"); })
				.selectAll("td").data(["name","id","hits","percent","sample","rank"])
					.enter().append("td").attr("class",function(d){return d;})

		//fill name
		view.selectAll(".name").data(nodes)
			.style("white-space","nowrap")
			.style("overflow","hidden")
			.style("text-overflow","ellipsis")
			.style("cursor","pointer")
			.append("span")
				.style("padding-left",function(d){return (+d.depth*4)+"px";})
				.html(function(d){return "<span class='fa'>&nbsp;</span>";})
				.append("span")
					.on("click", function(d){  
						highlight(d,false);
						return zoomSkip(d);
					})
					.text(function(d){return d.name;});
		//fill id
		view.selectAll(".id").data(nodes)
				.style("width","70px").style("text-align","right")
				.append("span")
				.filter(function(d){return +d.id>0})
					.append("a")
					.attr("href",function(d){ return "http://www.ncbi.nlm.nih.gov/Taxonomy/Browser/wwwtax.cgi?id="+d.id;})
					.attr("target", "taxonomy")
					.text(function(d){return d.id});
		//fill hits
		view.selectAll(".hits").data(nodes)
				.style("width","60px").style("text-align","right")
				.append("span").text(function(d){return d.data.hits;})
		//fill %
		view.selectAll(".percent").data(nodes)
				.style("width","60px").style("text-align","right")
				.append("span")
				//.text() fill in zoom()
		//fill sample
		view.selectAll(".sample").data(nodes)
				.style("width","80px").style("text-align","right")
				.append("span").html(function(d){
					return d.data.percent.toFixed(2)+"%/"+d.data.sample+"&nbsp;";
				})
		//fill rank
		view.selectAll(".rank").data(nodes)
				.style("width","130px")
			.append("span").text(function(d){return d.data.rank;});

		//internal nodes
		view.selectAll("tr")
			.filter(function(d){return d.children;})
			.select(".fa")
			.on("click",function(d){ return toggle(d); });
				
if(verbose){console.timeEnd("table");}				
	}
	
	function tip(state,d) {
		if(state=="show") {
			d3.select("#mtm-tip")
				.datum(d)
				.style("opacity",1)
				.html(function(d) {
					return d.name+"<br/>Taxonomy ID: "+(+d.id > 0 ? d.id :"")
						+"<br/>Rank: "+d.data.rank
						+"<br/>"+d.data.hits+" hits"
						+"<br/>"+d.data.percent.toFixed(2)
						+"% of sample "+d.data.sample
						+"<br/>"+(d.value*100/node.value).toFixed(2) 
						+"% of the view";
				});
		}
		else if(state=="hide") {
			d3.select("#mtm-tip").style("opacity",0);
		}
		else { // move
			d3.select("#mtm-tip").style("top", (d3.event.pageY+10)+"px")
            .style("left", (d3.event.pageX+10)+"px");
		}
	}
	
	function configChange(elem) {
		var vals=elem.id.split(/_/);
		if(elem.type=="checkbox") {
			if(elem.checked){ config[vals[0]][vals[1]]=true; }
			else { config[vals[0]][vals[1]]=false; }
		}
		else { config[vals[0]][vals[1]]=elem.value; }
	}
	
	function handleTouch(d) { touched==d ? touched="": touched=d; }
	
	//VIEW UPDATE//
	function updateColor() {
if(verbose){console.time("updateColor");}
		rank = ranks.indexOf(config.options.rank) //selected rank
		if(config.treemap.display) { setColorMap(rank); }
		if(config.table.display) {	setColorTable(rank); }
if(verbose){console.timeEnd("updateColor");}
	}

	function setColorMap(rank) {
if(verbose){console.time("setColorMap");}
		var rects = d3.select("#mtm-treemap").select(".mtm-view").selectAll("rect");
		if(config.options.color=="taxon") {
			rects.style("fill",function(d){return color(d.parent.name);});
		}
		else if(config.options.color=="rank") {
			//upper color
			rects.style("fill",function(d){return color(d.parent.name);});
			//list of node on the selected rank
			d3layout.nodes().filter(function(d){
				return d.data.rank == ranks[rank] && d.children})
				.forEach(function(d) {
					//list of leaves for each subtree
					var subleaves = getSubtree(d,[]).filter(function(d){return !d.children});
					rects.data(subleaves,function(d){return "v"+d.id+"-"+d.data.sample;})
						.style("fill",color(d.name));				
				});
		}
		else if(config.options.color=="sample") {
			rects.style("fill",function(d){return color(d.data.sample);});
		}
		else { //if(group=="max")
			rects.style("fill",function(d){
				var major = d;
				for (var i in d.parent.children) {
					if(!d.parent.children[i].children) {
						major= d.parent.children[i].data.hits> major.data.hits ? d.parent.children[i] : major;
					}
				}
				return color(major.data.sample);
			});
		}
		
		// gray upper
		if(config.options.upper=="gray") {
			rects.filter(function(d){return rank>=d.depth})
				.style("fill","#888");
		}
if(verbose){console.timeEnd("setColorMap");}
	}
	
	function setColorTable(rank) {
if(verbose){console.time("setColorTable");}
		var pcol,phits; //previous color and sum
		var lines = d3.select("#mtm-table").select(".mtm-view").selectAll("tr");
		var subs = []; //list of descendant.
		if(config.options.color=="taxon") {
			// bottom > up
			for (var i=lines[0].length;i>0;i--){
				d3.select(lines[0][i]).style("background-color",function(d){
					if(!d.children) {
						phits=d.data.hits;
						pcol=color(d.parent.name);				
					}
					else if(d.data.hits!=phits) {
						pcol=color(d.name);
						phits=d.data.hits;	
					}
					return pcol;
				});
			}//end bottom > up					
		}
		else if(config.options.color=="rank") {
			// bottom > up
			for (var i=lines[0].length;i>0;i--){
				d3.select(lines[0][i]).style("background-color",function(d){
					//Selected rank : new color for all the descendant
					if(rank==d.depth-1){
						pcol=color(d.name);
						phits=d.data.hits;
						for(tr in subs){		
							d3.select(subs[tr]).style("background-color",pcol);
						}
						subs=[];
					}
					//Descendant
					else if (rank<d.depth-1 && rank>-1) {
							subs.push(lines[0][i]);
					}
					//Initial color
					else {
						//leaf
						if(!d.children) {
							phits=d.data.hits;
							pcol=color(d.parent.name);				
						}
						//node if assigned=0 & sum = previous > same color. ELSE new color
						else if(d.data.hits!=phits) {
							pcol=color(d.name);
							phits=d.data.hits;	
						}
					}
					return pcol;
				});
			}//end bottom > up
		}
		else if(config.options.color=="sample"){
			lines.style("background-color",function(d){ return color(d.data.sample); });
		}
		else { // if(group=="max"){
			//leaves
			lines.filter(function(d){return !d.children;}).style("background-color",function(d){ 
				var major = d;
				for (var i in d.parent.children) {
					if(!d.parent.children[i].children) {
						major= d.parent.children[i].data.hits> major.data.hits ? d.parent.children[i] : major;
					}
				}
				return color(major.data.sample);
			});
			//nodes
			lines.filter(function(d){return d.children;}).style("background-color",function(d){ 
				var major = {data:{hits:0,sample:0}}; //d.children[0];
				for (var i in d.children) {
					if(!d.children[i].children) {
						major= d.children[i].data.hits> major.data.hits ? d.children[i] : major;
					}
				}
				return color(major.data.sample);
			});
		}

		//root
		d3.select(lines[0][0]).style("background-color","#888");
		// gray upper
		if(config.options.upper=="gray") {
			lines.filter(function(d){return rank>=d.depth})
				.style("background-color","#888");
		}
if(verbose){console.timeEnd("setColorTable");}
	}

	function updateLabel() {
if(verbose){console.time("updateLabel");}

		rank = ranks.indexOf(config.options.rank) //selected rank
		//font size
		if(config.treemap.display) {
			d3.select("#mtm-treemap").select(".mtm-labels").style("font-size",config.options.font+"px");
			d3.select("#mtm-tip").style("font-size",config.options.font+"px");
			setLabelMap(rank);
		}
		if(config.table.display) { 
			d3.select(".mtm-table").selectAll(".name").style("font-size",config.options.font+"px");
			setLabelTable(rank);
		}
if(verbose){console.timeEnd("updateLabel");}
	}

	function setLabelMap(rank) {
if(verbose){console.time("setLabelMap");}
		//delete previous labels
		var labels = d3.select("#mtm-treemap").select(".mtm-labels").html("");
		
		//select
		var labelled;
		if(config.options.label=="rank") { //show selected group || upper leaves
			labelled=d3layout.nodes(root).filter(function(d){
				return (rank == +d.depth-1) || (!d.children && rank > +d.depth)
			});
		}
		else { //label for each tags
			labelled=d3layout.nodes(root).filter(function(d){return !d.children;});
		}
		
		//guides
		labels.selectAll("path")
			.data(labelled)
			.enter().append("path")
				.attr("id",function(d){return "map"+d.id+d.data.sample;})
				.style("opacity",0)
				.style("pointer-events","none")
		
		//text
		labels.selectAll("text")
			.data(labelled)
			.enter().append("text")
				//.attr("class",function(d){return "t"+d.id;})
				.attr("text-anchor", "left")
				.attr("dy","0.5ex")
				.style("pointer-events","none")
				.append("textPath")
				.attr("xlink:href",function(d){return "#map"+d.id+d.data.sample;})
				.html(function(d){
					var tag = config.options.pattern;
					//replace
					tag = tag.replace(/#N/g,d.name);
					tag = tag.replace(/#I/g,d.id);
					tag = tag.replace(/#H/g,d.data.hits);
					tag = tag.replace(/#P/g,d.data.percent.toFixed(2));
					tag = tag.replace(/#V/g,(d.value*100/node.value).toFixed(2));
					tag = tag.replace(/#R/g,d.data.rank);
					tag = tag.replace(/#S/g,d.data.sample);
					return tag;
				})
if(verbose){console.timeEnd("setLabelMap");}
	}

	function setLabelTable(rank) {
if(verbose){console.time("setLabelTable");}
		var lines = d3.select("#mtm-table").select(".mtm-labels").selectAll("tr");	
		if(config.options.label=="rank" && rank!=-1){
			//collapse rank
			lines.filter(function(d){return rank == +d.depth-1;})
				.style("display","table-row")
				.select(".fa").attr("class","fa fa-plus-square-o");
			//expand upper
			lines.filter(function(d){return rank>=+d.depth;})
				.style("display","table-row")
				.select(".fa").attr("class","fa fa-minus-square-o");
			//hide lower
			lines.filter(function(d){return rank<+d.depth-1;})
				.style("display","none");
		}
		else { //expand all
			lines.style("display","table-row")
				.select(".fa").attr("class","fa fa-minus-square-o");		
		}
		//leaf
		lines.filter(function(d){return !d.children;})
			.select(".fa").attr("class","fa fa-square-o");
if(verbose){console.timeEnd("setLabelTable");}
	}
	
	function highlight(n,toggle) {
		if(toggle) {
			d3.selectAll(".v"+n.id+"-"+n.data.sample).style("opacity",".7");
			if(n.data.sample==0) {
				d3.selectAll(".mtm-hl")
				.attr("x",x(n.x)+1+2) 
				.attr("y",y(n.y)+20+2) //+header
				.attr("width",(kx*n.dx)-5)
				.attr("height",(ky*n.dy)-5);
			}
			else {
				d3.selectAll(".mtm-hl")
				.attr("x",x(n.parent.x)+1+2) 
				.attr("y",y(n.parent.y)+20+2) //+header
				.attr("width",(kx*n.parent.dx)-5)
				.attr("height",(ky*n.parent.dy)-5);
			}
		}
		else { //mouseout
			d3.selectAll(".v"+n.id+"-"+n.data.sample).style("opacity","1");
			d3.selectAll(".mtm-hl")
				.attr("x",0) 
				.attr("y",0)
				.attr("width",0)
				.attr("height",0);
		}
	}

	function zoomSkip(d) {
	//skip node if same hits (bridge)
		if(d==node){ //zoom out
			if(d.parent){ //no root
				if(d.parent.data.hits==d.data.hits) { //same hits
					node=d.parent;
					zoomSkip(d.parent);
				}
				else { zoom(d.parent); } //more hits
			}
			else {} //root 
		}
		else { //zoom in
			if(d.children) { //no leaf
				if (d.children[0].data.hits==d.data.hits) { //same hits
					zoomSkip(d.children[0]);
				}
				else { zoom(d); } //less hits
			}
			else { zoom(d.parent); } //leaf
		}
	}
	
	function zoom(n) {
if(verbose){console.time("zoom");}
		//button root switch
		if (n==root) {
			d3.selectAll(".mtm-root").classed("mtm-on",true);
			d3.selectAll(".mtm-root").classed("mtm-off",false);
		}
		else { 
			d3.selectAll(".mtm-root").classed("mtm-on",false);
			d3.selectAll(".mtm-root").classed("mtm-off",true); 
		}
		
		//update header
		d3.select("#mtm-treemap").select(".mtm-header")
			.datum(n)
			.on("click", function(d) { return zoomSkip(d); })
			.on('touchstart', function(d) {
					d3.event.preventDefault();
					if(touched==d) { //second touch
						touched="";		
						tip("hide",d);
						return zoomSkip(d);
					}
					else { //first touched
						if(touched!=""){ //opacity
							d3.selectAll(".v"+touched.id+"-"+touched.data.sample).style("opacity","1");
							highlight(touched,false);
						}
						touched=d;
						tip("show",d);
					}
				})
			.select("text")
				.text(function(d) { return d.name; });
		
		//update map	
		if(config.treemap.display) {
if(verbose){console.time("zoomMap");}			
			kx = w / n.dx, ky = h / n.dy;
			x.domain([n.x, n.x + n.dx]);
			y.domain([n.y, n.y + n.dy]);
				
			//all rect position and size
			var rectTranslate = d3.svg.transform()
				.translate(function(d) { return [x(d.x), y(d.y)] });
				
			d3.select("#mtm-treemap").select(".mtm-view").selectAll("rect")
				.transition()
				.duration(1500)
				.attr("transform", rectTranslate)
				.attr("width", function(d) { return kx * d.dx - 1; })
				.attr("height", function(d) { return ky * d.dy - 1; })
				
			//subfunction for labels guide
			function line(d) {
				var ax,ay,bx,by;
				//margin width and height
				var mw=Math.round(config.options.font*0.6); //SourceCodePro
				var mh=Math.round(config.options.font*1.3); //SourceCodePro 
				//rect width and heigth
				var rw=kx * d.dx - 1;
				var rh=ky * d.dy - 1;

				if(rw<rh) {//vertical
					ax=x(d.x+(d.dx/2));
					ay=y(d.y);
					bx=ax;
					by=y(d.y+d.dy);
					//margin && min width
					if(ay+mw<by-mw && rw>mh) { ay=ay+mw; by=by-mw;} 
					else {by=ay;}
				}
				else { //horizontal
					ax=x(d.x);
					ay=y(d.y+(d.dy/2));
					bx=x(d.x+d.dx);
					by=ay;
					//margin && min height
					if(ax+mw<bx-mw && rh>mh) { ax=ax+mw; bx=bx-mw;}
					else {bx=ax;}					
				}
				
				var path = d3.svg.line()
				.x(function(t) {return t[0];})
				.y(function(t) {return t[1];})
				.interpolate("linear");
		
				return path([[ax,ay],[bx,by]]);
			}
			
			//labels positions
			var labels = d3.select("#mtm-treemap").select(".mtm-labels")
			labels.selectAll("path")
				.transition().duration(1500)
				.attr("d",function(d) {return line(d); })			

if(verbose){console.timeEnd("zoomMap");}
		}
		
		//update table
		if(config.table.display) {
if(verbose){console.time("zoomTable");}
			//clear %
			d3.select("#mtm-table").select(".mtm-labels")
				.selectAll("tr").selectAll(".percent")
				.text("-");
			
			//set % of the subtree
			//var hundread = n.data.hits; //100%	
			d3.select("#mtm-table").select(".mtm-labels").selectAll("tr") //all lines
				.data(getSubtree(n,[]),
					function(d){return "t"+d.id+"-"+d.data.sample;}) //lines of subtree
				.selectAll(".percent") //column of %
				.text( //new text
					function(d){return (d.value*100/n.value).toFixed(2)+"%";}
				);

			//map call updateLabel() else it is needed
			if(!config.treemap.display) {updateLabel();} 
if(verbose){console.timeEnd("zoomTable");}
		}
		
		//update current node
		node = n;
if(verbose){console.timeEnd("zoom");}
	}
	
	function getSubtree(n,ns) {
		//get a list of all nodes in subtree of n, n included
		if(n.children) {
			n.children.forEach(function(c){
				ns = getSubtree(c,ns); 
			}); 
		}
		//exclude root because id not exist
		if(n!=root) { ns.push(n); }
		return ns;
	}
	
	function toggle(d) {
		var span = d3.select("#mtm-table").select(".v"+d.id+"-"+d.data.sample).select(".fa");
		if(span.classed("fa-minus-square-o")) {
			span.attr("class","fa fa-plus-square-o");
			//hide children 
			if (d.children) {
				for (var i in d.children) {
					hide(d.children[i]);
				}
			}
		}
		else {
			span.attr("class","fa fa-minus-square-o");
			//show children
			if (d.children) {
				for (var i in d.children) {
					show(d.children[i]);
				}
			}
		}
	}
	
	function hide(n) {
		//hide current raw and recursive
		d3.select("#mtm-table").selectAll(".v"+n.id+"-"+n.data.sample)
			.style("display","none");
		//recursive call
		if (n.children) {
			for (var i in n.children) {
				hide(n.children[i]);
			}
		}		
	}
		
	function show(n) {
		//show current raw and recursive
		var t = d3.select("#mtm-table").select(".v"+n.id+"-"+n.data.sample)
					.style("display","table-row");
		if(t.select(".fa").classed("fa-minus-square-o") && n.children) {
			for (var i in n.children) {
				show(n.children[i]);
			}
		}
	}
	
	//OUTPUT//
	function copy(n,p) {
		//clean the structure tree to fit with input format
		if (n.children && n.children.length>0) { //internal node
			var cur; // copy of n node in out tree.
			if(!p) { //root
				cur = {"name":n.name,"children":[],"data":{"assigned":0,"sum":n.data.hits,"rank":n.data.rank},"id":n.id};
				out = cur ;
			}
			else {
				if(n.data.hits == p.data.sum) { //bridge > merge up
					p.name = n.name;
					p.data.rank = n.data.rank;
					p.id= n.id;
					cur=p;
				}
				else { //create node
					cur = {"name":n.name,"children":[],"data":{"assigned":0,"sum":n.data.hits,"rank":n.data.rank},"id":n.id};
					p.children.push(cur);
				}
			}
			//recursive call
			for (var i in n.children) { copy(n.children[i],cur); }
		}
		else { //leaf
			p.data.assigned = p.data.assigned + n.data.hits;
		}
	}
	
	function ddl(name,url) {
		//hidden link to call DDL
		d3.select("#mtm-canvas").append("a")
			.attr("download",name)
			.attr("href",url)
			.node()
			.click();
	}
	
	function exportTab(n) {
		var str = n.name+"\t"
			+(+n.id >0 ? n.id : "")+"\t"
			+n.data.hits+"\t"
			+((n.data.hits * 100 / root.data.hits).toFixed(1))+"\t"
			+n.data.sample+"\t"
			+n.data.rank+"\n";
		//recursive call
		if (n.children && n.children.length>0) {
			for (var i in n.children) {
				str = str + exportTab(n.children[i]);
			}
		}
		return str;
	}
	
	function format(e) {
		//manage radio button switch in mtm.convertor
		if(e.value=="json"){
			d3.select("#mtm-fieldhead").text("Object property");
			d3.select("[name=mtm-tid]").attr("value","id");
			d3.select("[name=mtm-tname]").attr("value","name");
			d3.select("[name=mtm-hits]").attr("value","data.assigned");
			d3.select("#mtm-headrow").style("display","none");
		}
		else if(e.value=="tab"){
			d3.select("#mtm-fieldhead").text("Column index");
			d3.select("[name=mtm-tid]").attr("value","1");
			d3.select("[name=mtm-tname]").attr("value","2");
			d3.select("[name=mtm-hits]").attr("value","3");
			d3.select("#mtm-headrow").style("display","table-row");
		}
	}
	
	function convert() {
		var format = d3.select("[name=mtm-format]:checked").node().value;
		var file=d3.select("#mtm-convert").node().files[0];
		
		//root init.
		root={"name":"root","children":[],"data":{"assigned":0,"rank":"no rank"},"id":1}; //skeleton tree
		bkeys = [root.id]; //list of keys of nodes
		bobjs = [root]; //list of node -object-
			
		//read taxonomy
		var taxonomy=[];
		d3.text("./data/taxonomy.tsv", function(taxo) {
			taxo.split("\n").forEach(function(l){ //for each line
				var vals = l.split("\t");
				taxonomy[+vals[0]]={"id":+vals[0], "parent":+vals[1], "rank":vals[2], "name":vals[3]};
			});
		
			if(format=="json") {
				//get property
				var id=d3.select("[name=mtm-tid]").node().value.split(".");
				var name=d3.select("[name=mtm-tname]").node().value.split(".");
				var hits=d3.select("[name=mtm-hits]").node().value.split(".");
	
				//read input
				d3.json(URL.createObjectURL(file), function(data) {
					propertyMap(taxonomy,data,id,name,hits);
					//compute sum hits
					sumAllHits(data);
					//delete unused property
					propertyFilter(data);
					//create file
					var url = 'data:text/json;charset=utf8;filename=output.json,' + encodeURIComponent(JSON.stringify(out));
					//Direct DownLoad call
					ddl(file.name.replace(/.[^.]*$/,"")+"_metabin.json",url);
				});
				
			}
			else if(format=="tab") {
				//get property
				var id=+d3.select("[name=mtm-tid]").node().value-1;
				var name=+d3.select("[name=mtm-tname]").node().value-1;
				var hits=+d3.select("[name=mtm-hits]").node().value-1;
				var header=d3.select("[name=mtm-head]").property("checked");
	
				//read input
				d3.text(URL.createObjectURL(file), function(data) {
					var lines = data.split(/\r?\n/);
					var i;
					header ? i=1 :i=0; //ignore first line
					for(i;i<lines.length;i++) {//for each line
						if (lines[i]!="") { //ignore empty lines
							var vals = lines[i].split("\t");
							if(vals[id]==0) { //artificial node
								taxonomy[0]= {"id":vals[name], 
									"parent":1, 
									"rank":"no rank", 
									"name":vals[name]};
							}
							ancestor(taxonomy,vals[id],vals[hits]);
						}
					}
					
					//compute sum hits
					sumAllHits(root);
					//create file
					var url = 'data:text/json;charset=utf8;filename=output.json,' + encodeURIComponent(JSON.stringify(root));
					//Direct DownLoad call
					ddl(file.name.replace(/.[^.]*$/,"")+"_metabin.json",url);
				
				});
			}
		});
	}
	
	function ancestor(taxonomy,id,hits) {
		//search taxon in NCBI taxonomy, create node and parent
		var taxon = taxonomy[id],
		child,parent,
		newChild;//boolean
		
		//test if child exist
		var idx = bkeys.indexOf(taxon.id);
		if(idx > -1) { //if exist
			newChild=false;
			child=bobjs[idx];
			child.data.assigned=hits;
		}
		else { //else create
			newChild=true;
			child = {"name": taxon.name,
				"children": [],
				"data": {"assigned":hits, "rank":taxon.rank},
				"id": taxon.id}
			bkeys.push(child.id);
			bobjs.push(child);
		}
		
		//test if parent exist
		if(taxon.parent !=taxon.id) {
			var idx = bkeys.indexOf(taxon.parent);
			if(idx > -1) { //if exist
				parent=bobjs[idx];	
			}
			else { //else recursive call
				parent = ancestor(taxonomy,taxon.parent,0); 
			}
			//link
			if(newChild) {
				parent.children.push(child);
			}
		}
		return child;
	}

	function propertyMap(taxonomy,n,id,name,hits) {
		if(!n.data) {n.data={};}
		n.data.assigned=getProperty(n,hits);
		n.id=getProperty(n,id);
		if(+n.id==0 || !taxonomy[+n.id]) {
			n.name=getProperty(n,name);
			n.data.rank="no rank";
		}
		else {
			n.name=taxonomy[+n.id].name;
			n.data.rank=taxonomy[+n.id].rank;
		}
		//recursive call
		if(n.children.length>0) {
			for (var i in n.children) {
				propertyMap(taxonomy,n.children[i],id,name,hits);
			}
		}
	} 
	
	function propertyFilter(n,p) {
		//clean the input object to fit with metabin
		var cur = {"name":n.name,"children":[],"data":{"assigned":n.data.assigned,"sum":n.data.sum,"rank":n.data.rank},"id":n.id};
		if(!p) { //root
			out = cur ;
		}
		else { p.children.push(cur); }
		//recursive call
		for (var i in n.children) { propertyFilter(n.children[i],cur); }
	}
	
	function getProperty(n,path){
		var i=0,val=n;
		while(path[i]) {
			val=val[path[i]];
			i++;
		}
		return val;
	}
	
	function sumAllHits(n) {
		n.data.sum=+n.data.assigned;
		//recursive call
		if (n.children.length>0) {
			for (var i in n.children) {
				var sum = sumAllHits(n.children[i]);
				n.data.sum+=sum;
			}
		}
		return +n.data.sum;
	}
	
	//DEFINE OR EXPORTS//
	if (typeof define === "function" && define.amd) define(mtm); else if (typeof module === "object" && module.exports) module.exports = mtm;
	this.mtm = mtm;
	
}());
