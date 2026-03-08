
async function startQuiz(){

const category = document.getElementById("category").value;
const subject = document.getElementById("subject").value;
const count = document.getElementById("count").value;

document.getElementById("output").textContent = "Generating quiz...";

try{

const res = await fetch("/.netlify/functions/quiz",{
method:"POST",
headers:{ "Content-Type":"application/json"},
body:JSON.stringify({
category,
subject,
count
})
});

const data = await res.json();

document.getElementById("output").textContent =
JSON.stringify(data,null,2);

}catch(err){
document.getElementById("output").textContent =
"Error: "+err.message;
}

}
