// Using JS.require()
var D = require('date-utils');

var d1 = new Date("2014-08-12");
var d2 = new Date("2014-06-30");
//var d2 = new Date("2013-29-06T00:00:00.000Z");

console.log(d1)
console.log(d2)
console.log(d1.compareTo(d2))