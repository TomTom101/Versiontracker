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
            return version
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

    Sprintmanager = new JS.Class(Collection, {
        getVersionsForSprint: function(sprint) {
            var _list = this.select(function(obj) {
                return sprint == obj.sprint
            });
            return _list.map(function(obj) {return obj.version})
        },
        getSprintsForVersion: function(version) {
            var _list = this.select(function(obj) {
                return version == obj.version
            });
            return _list.map(function(obj) {return obj.sprint})
        },
        getLink: function(sprint, version) {
            // Returns only one item (there can be only one result)
            if (sprint instanceof Sprint && version instanceof Version) {
                var _list = this.select(function(obj) {
                    return sprint == obj.sprint && version == obj.version
                });
                return _list[0]
            }
        },
        setForVersionInSprint: function(sprint, version, obj) {
            jQuery.extend(this.getLink(sprint, version), obj)
        }
    });

    Version = new JS.Class({
        include: [JS.Comparable],
        extend: {
            priority: 1
        },
        initialize: function(id, name, ends, estimates) {
            this.id = id;
            this.name = name;
            this.priority = Version.priority++
            // The computed date of when work on the version must start in order to finish in time
            this.ends = new Date(ends).clearTime();
            this.sprints = [];
            points = 100
            if(estimates) {
                this.unestimated = estimates.unestimated || 0
                this.unestimated_points = estimates.unestimated * 8
                points = estimates.estimate + this.unestimated_points
            }
            //points += this.unestimated_points
            this.storypoints = this.inital_storypoints = points
        },
        setStoryPoints: function(points) {
            this.storypoints = points
            return this
        },
        setUnestimatedCount: function(unestimated) {
            this.unestimated = unestimated
            return this
        },
        isUnfinished: function() {
            return this.storypoints > 0
        },
        postpone: function() {
        	this.ends.addWeeks(3)
        	return this
        },
        getPctDone: function() {
            return Math.min(parseInt(((this.inital_storypoints-this.storypoints)/this.inital_storypoints)*100), 100)
        },
        getPctMissing: function() {
            return 100-this.getPctDone()
        },
        equals: function(object) {
            return (object instanceof this.klass) && object.id == this.id;
        },
        /*
            Returns remaining (or surplus of) story points after using them towards the version.
         */
        substractStoryPoints: function(points) {
            this.storypoints -= points;
            console.log("subtracted " + points.toFixed(0) + " from " + this.name + ", " + (this.storypoints.toFixed(0)) + " left.")
            if (this.storypoints < 0) {
                console.log("Saved " + this.storypoints.toFixed(0) + " in " + this.name)
            }
            return this.storypoints;
        },
        compareTo: function(other) {
            if (this.storypoints < other.storypoints) return -1;
            if (this.storypoints > other.storypoints) return 1;
            return 0;
        },
        getInitialStoryPoints: function() {
        	return this.inital_storypoints.toFixed(0)
        },
        getCurrentStoryPoints: function() {
        	return Math.max(0, this.storypoints.toFixed(0))
        }
    });

    Sprint = new JS.Class({
    	include: [JS.Comparable],
        extend: {
            velocity: 140,
            days: 18,
            index: 0
        },
        initialize: function(name, starts) {
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
        compareTo: function(other) {
            if (this.ends < other.ends) return 1;
            if (this.ends > other.ends) return -1;
            return 0;
        },
        substractAvailableStoryPoints: function(self) {
            activeVersions = self.sprintmanager.getVersionsForSprint(this)
            var subtract = Sprint.velocity / activeVersions.length;
            console.log("subtract " + subtract.toFixed(0) + " #versions: " + activeVersions.length)
            var remainingStoryPoints, remainder = 0;
            // starting w/ the versions with the least SPs. This way we can apply possible remainders directly to the next "heavier" version
            var versionsByPointsAsc = activeVersions.sort(Version.compare);
            versionsByPointsAsc.forEach(function(version) {
                version.sprints.unshift(this);
                // remainder is added in the previous loop
                var usedOnVersion = subtract + remainder
                remainingStoryPoints = version.substractStoryPoints(usedOnVersion);
                if(remainingStoryPoints < 0) {
                    // if the version had less SPs left, we use the remainder towards the next version in the sprint
                    remainder = Math.abs(remainingStoryPoints)
                } else {
                    remainder = 0
                }
                // Sets the number of stroy points used towards a version in a sprint
                self.sprintmanager.setForVersionInSprint(this, version,
                    {
                        storypoints: (usedOnVersion - remainder),
                        remaining: Math.max(0, remainingStoryPoints)
                    })
            }, this);
            this.remainder = remainder || undefined

            console.log("We have " + remainder + " points left in this sprint!")

        }
    });

    versiontracker = root.versiontracker = function() {
        var self = {}
        self.sprintmanager = new Sprintmanager()
        self.proxy = 'http://localhost:8080/?url='

        self.init = function() {
            jQuery.ajaxSetup({async: false});

            self.sprints = self.getSprints()
            var versions = self.getVersionsArray()
            var estimates = self._getEstimatesForVersions(versions)

            self.versions = new JS.SortedSet()
            _.each(versions, function(version) {
                //console.log("estimate for " +version.name+ ", "+ version.id+" is " +estimates[version.id].estimate  )
                var VersionObj = new Version(version.id, version.name, version.releaseDate, estimates[version.id])
                self.assignAvailableSprints(VersionObj)
                self.versions.add(VersionObj)
            })
            //console.log(self.versions)
        }
	    // Link the all available sprints to the version before release.
	    // Must do this after object generation because we need the computed "ends" date
        self.assignAvailableSprints = function(version) {
        	version.available_sprints = self.sprints.select(function(sprint) {
            	return sprint.ends < version.ends
            })
            return version
        }

        self.getVersionById = function(id) {
        	return self.versions.select(function(version) {
        		return version.id == id
        	})[0]
        }
        self.rebuild = function() {
        	self.versions.forEach(function(version) {
        		version.storypoints = version.inital_storypoints
        		version.sprints = []
        	})
        }


        self.solve = function() {
            // Go through each sprint, from last to first
            self.sprintmanager = new Sprintmanager()
        	self.sprints.reverseForEach(function(sprint) {
                console.log(" ** Sprint " + sprint.name +
                    " starts " + sprint.starts.toYMD() +
                    " ends " + sprint.ends.toYMD())

                // We must work on everything that is not finished and finshes with or after the sprint
                var _activeVersions = self.versions.select(function(version) {
                    return (version.storypoints > 0 && version.ends.compareTo(sprint.ends) > -1);
                });

                // Quite clumsy to turn this array into a collection just to be able to do a forEach
                var activeVersions = new Collection()
                activeVersions.concat(_activeVersions)
                activeVersions.forEach(function(version) {
                    self.sprintmanager.add({version: version, sprint: sprint})
                })
                // deduct storypoints from each version in a sprint
                // the version will be updated with the remaining story points and may on may not be
                // running/active in the next sprint
                sprint.substractAvailableStoryPoints(self)
            });
            //var ac = self.getActiveVersions();
            console.log(self.versions)

        }

        self.getActiveVersions = function() {
            //@todo should not set but get!
            set = new JS.Set()
            self.sprintmanager.forEach(function(link) {
                set.add(link.version)
            })
            // Sorted by release date early to late
            return set.sort(function(a,b) { return (a.id - b.id)  })
        }
        self.getVersionsArray = function() {
            var jira = 'https://www.native-instruments.com/bugtracker/rest/api/latest/project/WWW/versions'
            var url = self.proxy + encodeURIComponent(jira)
            var versions = []

            jQuery.getJSON(url, function(data) {
                versions = _.filter(data, function(version) {
                    return  (
                        version.archived == false &&
                        version.released == false &&
                        version.releaseDate
                    )
                });
            })

            return versions
        }

        self._getEstimatesForVersions = function(versions) {
            var jira = 'https://www.native-instruments.com/bugtracker/rest/api/latest/search'

            var ids = _.map(versions, function(version) { return version.id }).join()
            var jql = 'project = WWW AND status not IN(Closed,Deployed)'
                    + ' AND type in (Bug,Task,Improvement,"New Feature")'
                    + ' AND fixVersion IN('+ ids + ')'
            var query = '?maxResults=500&fields=customfield_11121,fixVersions&jql=' + encodeURIComponent(jql)
            var url = self.proxy + encodeURIComponent(jira + query)

            var estimates = []
            jQuery.getJSON(url, function(data) {
                _.each(data.issues, function(issue) {
                    var fixId = issue.fields.fixVersions[0].id
                    if (!(fixId in estimates)) {
                        estimates[fixId] = {unestimated: 0, estimate: 0}
                    }
                    var estimate = parseInt(issue.fields.customfield_11121)
                    if(!estimate) {
                        estimates[fixId].unestimated++
                    }
                    estimates[fixId].estimate += estimate || 0
                })
            }).error(function(XHR, txt, message) {
                alert("Could not retrieve estimates: " + message)
            })
            return estimates
        }
        self.getSprints = function() {
            var _reference_sprint_start = new Date("2014-05-19")
            var _reference_sprint_number = 7
            var sprints = new Collection()
            var today = new Date().clearTime()
            console.log(sprints.length())
            Sprint.index = 0

            // Need at least so many sprints to cover all versions
            for (var i = _reference_sprint_number; i <= _reference_sprint_number + 11; i++) {
                var start_date = _reference_sprint_start;
                if(sprint) {
                    // new start date is 3 days after the last sprint ended (using Friday as end date here)
                    start_date = new Date(sprint.ends).addDays(3)
                }
                var sprint = new Sprint("v2."+i+".0", start_date);

                // Only add future sprints
                if(sprint.starts >= today) {
                    sprints.add(sprint);
                } else {
                    // If this sprint is not in the future, unset it and try 3 weeks later
                    // We don't care about currently running sprints since we could not apply the full velocity.
                    sprint = undefined
                    start_date = start_date.addWeeks(3)
                    // The index defines the offset in the view and is increased w/ every instantiation. Not very elegant to reset is manually.
                    Sprint.index = 0
                }
            }
            return sprints
        },
        self.getActiveSprints = function() {
            return self.sprints
        },
        self.getActiveSprint = function() {
            // includeHistoricSprints=false has no effect
            //https://www.native-instruments.com/bugtracker/rest/greenhopper/1.0/sprintquery/160/?includeHistoricSprints=false&includeFutureSprints=true
            // sprints..state: ACTIVE
        }
        self.getIssuesForActiveVersions = function() {
            // version_ids = getVersions
            //https://www.native-instruments.com/bugtracker/rest/api/latest/search?jql=fixVersion%20in([version_ids])
        }
        self.getIssuesInCurrentSprint = function() {
            // sprint_id = getActiveSprint
            //https://www.native-instruments.com/bugtracker/rest/api/latest/search?jql=sprint=[sprint_id]
            // estimate customfield_11121
            // version fixVersions.id
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
