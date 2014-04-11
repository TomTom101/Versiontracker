// complains about VersionCollection, if used w/ var, cannot be seen in the html file. Must be exported??

//"use strict";

(function() {
  var root = this
  var previous_versiontracker = root.versiontracker
  var has_require = typeof require !== 'undefined'

  VersionCollection = new JS.Class({
    	include: [JS.Comparable, JS.Enumerable],
		initialize: function() {
	        this._list = [];
	        for (var i = 0, n = arguments.length; i < n; i++)
	            this._list.push(arguments[i]);
	    },
        add: function(version) {
            this._list.push(version);   
        },
        concat: function(versionArray) {
            this._list = this._list.concat(versionArray);   
        },
        length: function() {
	    	return this._list.length;
	    },

	    forEach: function(block, context) {
	        if (!block) return this.enumFor('forEach');

	        for (var i = 0, n = this._list.length; i < n; i++)
	            block.call(context, this._list[i]);

	        return this;
	    }
    });

    Version = new JS.Class({
            include: [JS.Comparable, JS.Enumerable],
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
                console.log("subtracted " + points.toFixed(0) + " from " + this.name +", " + (this.story_points.toFixed(0))+" left.")
                if(this.story_points < 0) {
                    console.log("Saved "+ this.story_points.toFixed(0) +" in " + this.name)
                    return Math.abs(this.story_points);
                }
                return 0;
            },

            compareTo: function(other) {
                if (this.story_points < other.story_points) return -1;
                if (this.story_points > other.story_points) return 1;
                return 0;
            }
        });

    Sprint = new JS.Class({
        extend: {
           velocity: 160
        },
        initialize: function(name, starts) {
            this.versions = new VersionCollection();
            this.name = name;
            this.starts = new Date(starts).clearTime();
            this.ends = new Date(starts).addDays(21).clearTime();
            //console.log(this.starts > this.ends)


        },
        add: function(version) {
            if(version instanceof Array) {
                this.versions.concat(version)
            } else {
                this.versions.add(version);
            }
        },

        substractAvailableStoryPoints: function() {
            var subtract = Sprint.velocity/this.versions.length();
            console.log("subtract "+subtract.toFixed(0)+", #versions: "+this.versions.length())
            var remainder = 0;
            // if retrieved sorted by SPs asc, we could 
            var versionsByPointsAsc = this.versions.sort(Version.compare);
            versionsByPointsAsc.forEach(function(version) {
                version.should_start = sprint.starts;
                remainder = version.substractStoryPoints(subtract + remainder);
            }, sprint);
            if(remainder > 0) {
                console.log("We have "+remainder+" points left in this sprint!")
            }
        }
    });

	  versiontracker = root.versiontracker = function() {
	  	var self = {}

//	  	var versions = new VersionCollection()

	    //versions.add(new Version("Relaunch 1.1", "2014-08-28", 41+17*13))
	    //var version = new Version("Relaunch 1.1", "2014-08-28", 41+17*13)

	  	self.hello = function() {
	  		console.log("hello world");
	  	},

	  	self.run = function(sprints, versions) {
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
		    }
	  	}

	  	return self;
	  }

	  if( typeof exports !== 'undefined' ) {
	    if( typeof module !== 'undefined' && module.exports ) {
	      exports = module.exports = versiontracker
	    }
	    exports.versiontracker = versiontracker
	  } 
	  else {
	    root.versiontracker = versiontracker
	  } 




}).call(this);