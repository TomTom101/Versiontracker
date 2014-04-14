// complains about Collection, if used w/ var, cannot be seen in the html file. Must be exported??

//"use strict";

;(function() {
    var root = this
    var previous_versiontracker = root.versiontracker
    var has_require = typeof require !== 'undefined'

    Collection = new JS.Class({
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
            this._list.push.apply(this._list, versionArray);
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
            this.first_sprint = undefined;
            this.last_sprint = undefined;
            this.ends = new Date(ends).clearTime();
            this.story_points = this.inital_storypoints = points;

        },
        /* Returns 0 if version is not finished after applying SPs and the remainder if finished.
         */
        substractStoryPoints: function(points) {
            this.story_points -= points;
            console.log("subtracted " + points.toFixed(0) + " from " + this.name + ", " + (this.story_points.toFixed(0)) + " left.")
            if (this.story_points < 0) {
                console.log("Saved " + this.story_points.toFixed(0) + " in " + this.name)
                return Math.abs(this.story_points);
            }
            return 0;
        },

        compareTo: function(other) {
            if (this.story_points < other.story_points) return -1;
            if (this.story_points > other.story_points) return 1;
            return 0;
        },
        getInitialStoryPoints: function() {
        	return this.inital_storypoints.toFixed(0)
        },
        getCurrentStoryPoints: function() {
        	return Math.max(0, this.story_points.toFixed(0))
        }
    });

    Sprint = new JS.Class({
    	include: [JS.Comparable],
        extend: {
            velocity: 160,
            days: 21,
            index: 0
        },
        initialize: function(name, starts) {
            //this.versions = new Collection();
            this.index = Sprint.index++;
            this.name = name;
            this.starts = new Date(starts).clearTime();
            this.ends = new Date(starts).addDays(Sprint.days).clearTime();
            //console.log(this.starts > this.ends)


        },
        add: function(version) {
            if (version instanceof Array) {
                this.versions.concat(version)
            } else {
                this.versions.add(version);
            }
        },

        substractAvailableStoryPoints: function(activeVersions) {
            var subtract = Sprint.velocity / activeVersions.length();
            console.log("subtract " + subtract.toFixed(0) + ", #versions: " + activeVersions.length())
            var remainder = 0;
            // if retrieved sorted by SPs asc, we could
            var versionsByPointsAsc = activeVersions.sort(Version.compare);
            versionsByPointsAsc.forEach(function(version) {
            	if(version.last_sprint == undefined) {
                	version.last_sprint = this;
            	}
                version.first_sprint = this;
                remainder = version.substractStoryPoints(subtract + remainder);
            }, this);
            if (remainder > 0) {
                console.log("We have " + remainder + " points left in this sprint!")
            }
        }
    });

    versiontracker = root.versiontracker = function() {
        var self = {}
        self.sprintmanager = new Collection()

        self.init = function(sprints, versions) {
        	sprints.reverseForEach(function(sprint) {
                console.log(" ** Sprint " + sprint.name +
                    " starts " + sprint.starts.toYMD() +
                    " ends " + sprint.ends.toYMD())

                // We must work on everything that is not finished and finshes with or after the sprint
                var _activeVersions = versions.select(function(version) {
                    return (version.story_points > 0 && version.ends.compareTo(sprint.ends) > -1);
                });

                // Quite clumsy to turn this array into a collection just to be able to do a forEach
                var activeVersions = new Collection()
                activeVersions.concat(_activeVersions)
                activeVersions.forEach(function(version) {
                    self.sprintmanager.add({version: version, sprint: sprint})
                })
                var l  = self.getLinks(sprint)
                console.log(typeof l)
                console.log(l.length)
                if (l.length > 0) {

                l[0].value = 1234
                }
                console.log()
                //console.log(self.getVersionsForSprint(sprint))

                sprint.substractAvailableStoryPoints(activeVersions)
            });
        }

        self.getLinks = function(object) {

            if (object instanceof Sprint) {
                return self._getVersionsForSprint(object, false)
            }
            if (object instanceof Version) {
                return self._getSprintsForVersion(object, false)
            }
        }

        self._getVersionsForSprint = function(sprint, deep) {
            var _list = self.sprintmanager.select(function(obj) {
                return sprint == obj.sprint
            });
            if(typeof deep !='undefined' && deep === true) {
                return _list.map(function(obj) {return obj.version})
            }
            return _list
        }

        self._getSprintsForVersion = function(version, deep) {
            var _list = self.sprintmanager.select(function(obj) {
                return version == obj.version
            });
            if(typeof deep !='undefined' && deep === true) {
                return _list.map(function(obj) {return obj.sprint})
            }
            return _list
        }

        self.solve = function() {

            console.log(self.sprintmanager)
        }

        return self;
    }

    if (typeof exports !== 'undefined') {
        if (typeof module !== 'undefined' && module.exports) {
            exports = module.exports = versiontracker
        }
        exports.versiontracker = versiontracker
    } else {
        root.versiontracker = versiontracker
    }

}).call(this);
