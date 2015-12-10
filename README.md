# MetaTreeMap
MetaTreeMap (MTM) is a module developed to visualize phylogenic trees where each species (node) has a number of reads (quantity) that map on the reference genome of this species. Each species is represented by a rectangle and its area is proportional to the number of assigned reads. The final figure is nested rectangles representing tree branches.

# Web service
MTM can be use online at [this address](http://metasystems.riken.jp/visualization/treemap/index.htm).
For more information see the [user guide](http://metasystems.riken.jp/visualization/treemap/html/documentation.htm).

# Javascript Library
MTM can be use as a javascript library and include in your own webpage.

**Download** the minify version [here](https://raw.githubusercontent.com/mhebrard/MetaTreeMap/master/mtm.min.js). File is on this repo ./mtm.min.js

**Include** the library in your web page like this: 

```
<script src="./mtm.min.js"></script>
```

**Exposed functions:**

* **mtm.config(obj)**: **TODO**
* **mtm.convertor(location)**: display a form, in a div with id=_location_, to convert JSON or tabular file in the proper input format for MTM.
* **mtm.load(array)**: load the data files that will be displayed. _array_ is a list of string _<path/to/file>_. Files must be in JSON format (see specifications [here](http://metasystems.riken.jp/visualization/treemap/html/documentation.htm#standard)) 

```
mtm.load(["data/HuFS.json","data/HuFU.json"]);
```

* **mtm.menu(location, width)**: display the option bar in the div with id=_location_ and width=_width_
* **mtm.save(mode)**: create file from the current view, and allow user to download the file. _mode_ can be : "json", "svg", "png", "txt" or "config". See [documentation](http://metasystems.riken.jp/visualization/treemap/html/documentation.htm#export) for more details. 
* **mtm.table(location, width, height, menu)**: create the table view in the div with id=_location_. the dimmention of the view are _width_ x _height_ in pixels. If _menu_ is true, the option bar will be inside the div.
* mtm.toggle: **DELETE**
* **mtm.treemap(location, width, height, menu,labels)**: create the treemap view in the div with id=_location_. the dimmention of the view are _width_ x _height_ in pixels. If _menu_ is true, the option bar will be inside the div. _labels_ is the pattern used for labelling the rectangles (see [documentation](http://metasystems.riken.jp/visualization/treemap/html/documentation.htm#pattern) for more details.
* **mtm.version**: return the version number

