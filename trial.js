const sort = function (a, b) {
    if (a.parents.length < b.parents.length) {
      return -1;
    }
    if (a.parents.length > b.parents.length) {
      return 1;
    }
    return 0;
};

// const arr = [{parents: ["1","2"]},{parents: ["1","2","3"]},{parents: ["1"]}];
// console.log(arr);
// arr.sort(sort);
// console.log(arr);

const threads = {
  "1": {
    content: "c1",
    parents: ["1"]
  }
}

const c2 = {
  content: "c2",
  parents: ["1","2"]
}

const c3 = {
  content: "c3",
  parents: ["1","2","3"]
}

const arr = [c2,c3];
arr.sort(sort);
value = threads["1"];
// for(var c in arr){
//   c.reply = 
// }

comments = [{
  reply: [{

  },{

  }]
},{

}];