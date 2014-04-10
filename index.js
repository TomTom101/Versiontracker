// Using JS.require()

var JS = require('jsclass');

JS.require('JS.Class', function(Class) {

	var Date_ = require('date-utils');
	var Comparable = require('jsclass/src/comparable').Comparable;
	var Enumerable = require('jsclass/src/enumerable').Enumerable;


    var VersionCollection = new Class({
    	include: [Comparable, Enumerable],
		initialize: function() {
	        this._list = [];
	        for (var i = 0, n = arguments.length; i < n; i++)
	            this._list.push(arguments[i]);
	    },
	    add: function(version) {
	    	this._list.push(version);	
	    },

	    forEach: function(block, context) {
	        if (!block) return this.enumFor('forEach');

	        for (var i = 0, n = this._list.length; i < n; i++)
	            block.call(context, this._list[i]);

	        return this;
	    }
    });

    var Version = new Class({
    	include: [Comparable, Enumerable],
    	initialize: function(name, ends, points) {
    		this.name = name;
            // The computed date of when work on the version must start in order to finish in time
            this.should_start = undefined;
    		this.ends = new Date(ends).clearTime();
    		this.story_points = points;

    	},
    	/* Returns 0 if version is not finished after applying SPs and the remainder if finished.
        */
    	substractStoryPoints: function(points) {
    		this.story_points -= points;
            if(this.story_points < 0) {
                return Math.abs(this.story_points);
            }
            return 0;
    	},
    	compareTo: function(other) {
    		console.log(this.ends)
    		console.log(other.ends)
	        if (this.ends < other.ends) return -1;
	        if (this.ends > other.ends) return 1;
	        return 0;
	    }
    });

    var Sprint = new Class({
        extend: {
    	   velocity: 160
        },
    	initialize: function(name, starts) {
    		this.versions = [];
    		this.name = name;
    		this.starts = new Date(starts).clearTime();
    		this.ends = new Date(starts).clearTime().addDays(21);
    		//console.log(this.starts > this.ends)


    	},
    	add: function(version) {
    		if(version instanceof Array) {
    			this.versions = this.versions.concat(version)
    		} else {
    			this.versions.push(version);
    		}
    	},

    	substractAvailableStoryPoints: function() {
    		var subtract = Sprint.velocity/this.versions.length;
    		console.log("subtract "+subtract+", #versions: "+this.versions.length)

            // if retrieved sorted by SPs asc, we could
    		for (var i = 0, n = this.versions.length; i < n; i++) {
                this.versions[i].should_start = this.starts;
    			this.versions[i].substractStoryPoints(subtract)
    		}
    	}
    });

    var sprints = []
    var _first = new Date("2014-02-24");

    // Need at least so many sprints to cover all versions
    for (var i = 4; i < 12; i++) {
   		var start_date = _first;
   		if(sprint) {
   			start_date = new Date(sprint.ends)//.addDays(3)
   		}
   		var sprint = new Sprint("2."+i+".0", start_date);
    	sprints.push(sprint);
    }

    var versions = new VersionCollection()

    versions.add(new Version("Relaunch 1.1", "2014-08-28", 41+17*13))
    versions.add(new Version("Relaunch 1.0", "2014-06-05", 421-40))
    versions.add(new Version("Product Finder 1.0", "2014-06-05", 91+3*13))
    versions.add(new Version("User Library 1.1", "2014-04-24", 136+5*13))

    for (var i = sprints.length-1; i >= 0; i--) {
    	sprint = sprints[i]
    	console.log(" ** Sprint "+ sprint.name + 
    			" starts " 	+ sprint.starts.toYMD() +
    			" ends " 	+ sprint.ends.toYMD())
    	
    	// We must work on everything that is not finished and finshes with or after the sprint
		var stillRunning = versions.select(function(version) {
	    	return (version.story_points > 0 && version.ends.compareTo(sprint.ends) > -1);
	    });		

		if (i>0) {
			sprint.add(stillRunning);
			sprint.substractAvailableStoryPoints()
		}
    	console.log(sprint)
    	console.log()


    }

    console.log(versions)



});
