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

* **mtm.convertor(location)**: display a form, in a HTML container (div) with id=**location**, used to convert JSON or tabular file in the proper input format for MTM.

* **mtm.load(filesList,config)**: load the data files and a config file. **fileList** is a list of string, path of json files (see specifications [here](http://metasystems.riken.jp/visualization/treemap/html/documentation.htm#standard)) . **config** is a json file with the list of options for MTM (see specifications [here](http://metasystems.riken.jp/visualization/treemap/html/documentation.htm#config)).
```
mtm.load(["data/sample1.json","data/sample2.json"],"./mtm-config.json");
```

* **mtm.save(mode)**: create file from the current view, and allow user to download the file. **mode** can be : "json", "svg", "png", "txt" or "config" (see [documentation](http://metasystems.riken.jp/visualization/treemap/html/documentation.htm#export) for more details) 

* **mtm.version**: return the version number

# Repository

* **data**: example data files used as input for MTM. Sequensing data from Kurokawa et al, taxonomic assignation computed with [MetaBin](http://metabin.riken.jp/). In addition **taxonomy.tsv** is the list of NCBI taxa with ID and phylogenic rank information (file needed for convertor module).

> Kurokawa,K. et al. (2007) Comparative metagenomics revealed commonly enriched gene sets in human gut microbiomes. DNA Res., 14(4), 169-181. 

* **html**: Documentation and feedback form.
* **img**: images for documentation.
* **js**: javascript libraries and sources.
* **LICENCE**: full licence file.
* **README**: current abstract
* **index.htm**: The frontpage of the web interface.
* **mtm-config.json**: the default config file for MTM.
* **mtm.min.js**: the minify version of MTM (used by the web interface)
