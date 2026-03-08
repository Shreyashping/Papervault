
exports.handler = async function (event) {

if(event.httpMethod !== "POST"){
return {
statusCode:405,
body:JSON.stringify({error:"Method Not Allowed"})
};
}

try{

const {category,subject,count} = JSON.parse(event.body);

const prompt = `Generate exactly ${count} multiple choice questions for:

Category: ${category}
Subject: ${subject}

Rules:
- Indian exam style (CBSE/JEE/NEET)
- 4 options (A,B,C,D)
- one correct answer
- short explanation

Return ONLY JSON:

[
{
"question":"",
"option_a":"",
"option_b":"",
"option_c":"",
"option_d":"",
"correct":"A",
"explanation":""
}
]
`;

const response = await fetch("https://api.anthropic.com/v1/messages",{
method:"POST",
headers:{
"Content-Type":"application/json",
"x-api-key":process.env.ANTHROPIC_KEY,
"anthropic-version":"2023-06-01"
},
body:JSON.stringify({
model:"claude-3-haiku-20240307",
max_tokens:2000,
messages:[{role:"user",content:prompt}]
})
});

const data = await response.json();

let text = data.content[0].text.trim();

text = text.replace(/```json/g,"").replace(/```/g,"").trim();

const parsed = JSON.parse(text);

return {
statusCode:200,
headers:{"Content-Type":"application/json"},
body:JSON.stringify(parsed)
};

}catch(err){

return{
statusCode:500,
body:JSON.stringify({error:err.message})
};

}

};
