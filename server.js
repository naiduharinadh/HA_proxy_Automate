const WebSocket = require('ws');
const express = require("express")
const bodyParser = require('body-parser');
const path = require('path');
const { exec } = require('child_process');
const re = require('re');
const http = require('http');
//the above line exactly equal to
//const childprcs = require("child_process")
//cont exec = childprcs.exec


const ip = "13.210.185.110" ;
const app = express();

const server = require('http').createServer(app);
const wss = new WebSocket.Server({ server });

// Set the 'views' directory
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(bodyParser.json());


//updated line from harinadh
app.get("/home", (req,resp)=>{
        const data = {
            ip: ip,
        };

        resp.render("form",data)
})


app.get("/collectdata", (req,resp)=>{
        const username = req.query.username;
        const lbip=req.query.lbip;
        const password= req.query.password;

        console.log(username,lbip,password);
        exec(`sed -i "/\[HAproxyServers\]/a\ ${lbip}  ansible_user=${username}   ansible_ssh_private_key_file=/root/.ssh/id_rsa " /root/haproxy/scripts/inventory.ini `,(error,stdoutput,stderr)=>{
               console.log("this is upper block ");
                exec("ansible-playbook  -i /root/haproxy/scripts/inventory.ini /root/haproxy/scripts/haProxy.yml", (anserror,ansibleOut, ansibleStderr )=> {


                console.log("this is harinadh..... sub child ");
                resp.send(ansibleOut);

                })

        })

})

app.get("/createws",(req,resp)=>{

        const websrvip = req.query.websrvip;
        const wsusername= req.query.wsusername;
        const wspassword= req.query.wspassword;
        console.log("workspace ips are ",websrvip, wsusername, wspassword);
	//sed -i '/\[webServers\]/a\${websrvip}  ansible_user=${wsusername}   ansible_password=${wspassword}' /root/haproxy/scripts/inventory.ini
        exec( `sed -i " /\[webServers\]/a\ ${websrvip}  ansible_user=${wsusername}   ansible_ssh_private_key_file=/root/.ssh/id_rsa " /root/haproxy/scripts/inventory.ini` , ( error, stdout, stderr ) => {
                console.log("web server slaves are added ");
                exec("ansible-playbook -i /root/haproxy/scripts/inventory.ini  /root/haproxy/scripts/HTTPDconfig.yml", ( playerror, wsplayout, wsplaystderror ) => {
                        resp.send(wsplayout);

                })


        } )

})




app.post("/terraform",(req,resp)=>{

    const { cloudProvider,workenv, variables } = req.body;
    let terraformCommand = `terraform -chdir=/root/haproxy/terraform `;
        // REFERENCE COMMAND    terraform apply -var="region=us-west-2" -var="instance_type=t2.micro"

        const command = ` bash change_workspace.sh `;

        if ( cloudProvider === "aws"){
                //command 1 to change the workdir
//              exec("bash ./scripts/change_workspace.sh" , (err,stdout, stderr)=>{
               
                exec( "terraform -chdir=/root/haproxy/terraform workspace select " + " " + workenv , (err,stdout, stderr)=>{
                        if(err){
                                console.log(err);
                        }
                        else if(stderr){
                                console.log(stderr);
                        }
                        else{
                                    wss.clients.forEach(client => {
                                            if (client.readyState === WebSocket.OPEN) {
//                                            client.send( " qork space changed to "+ workenv ); donestep2
					    client.send("donestep1" ); 
                                        }
                                 });
                                console.log(stdout);

				let tfplan  = `terraform -chdir=/root/haproxy/terraform  plan  -lock=false `;
				variables.forEach((variable, index) => {
       					 tfplan += `  -var="${variable.value}"   `   ;
				    });
                                exec( tfplan   , (err,stdout, stderr)=>{
                                        console.log("this is else block inside aws ");
                                        if(err || stderr){
                                               const errorMessage = err ? err.message : stderr;
                                                                                        console.error("Error:", errorMessage);
                                                                                        // Send error message to clients
                                                                                        wss.clients.forEach(client => {
                                                                                    if (client.readyState === WebSocket.OPEN) {
                                                                                client.send("<pre>" + errorMessage + "</pre>");
									
                                                                                                }
                                                                                                });
                                        }
                                        else{
						console.log(stdout);
						wss.clients.forEach(client => {
                                                                                    if (client.readyState === WebSocket.OPEN) {
                                                                                // client.send("<pre>" + stdout + "</pre>");
											    client.send("donestep2");
                                                                                                }
                                                                                                });
                                                                         

//						const tfApply = " bash /root/haproxy/terraform/change_workspace.sh " + " " + workenv;
					//	const tfApply = " terraform "+ " " + "apply" + " " + "-auto-approve";
						let tfApply  = `terraform -chdir=/root/haproxy/terraform   apply -auto-approve `;
                                variables.forEach((variable, index) => {
                                         tfApply += `  -var="${variable.value}"   `   ;
                                    });


								const childProcess = exec(tfApply, (err, stdout, stderr) =>{
													if (err || stderr) {										        const errorMessage = err ? err.message : stderr;
  										        console.error("Error:", errorMessage);
										        // Send error message to clients
										        wss.clients.forEach(client => {
									            if (client.readyState === WebSocket.OPEN) {
								                client.send("<pre>Error: " + errorMessage + "</pre>");
												}
											        });
									 } 
									else {
									        console.log("Stdout:", stdout);
									        // Send stdout to clients
									        wss.clients.forEach(client => {
									            if (client.readyState === WebSocket.OPEN) {
									                //client.send("<pre>" + stdout + "</pre>");
											   client.send("donestep3");
										            }
										        });
										    }
										});


                                        }
                                })
                        }
                 })


                // command to execute the terraform
/*              exec("terraform plan --dir=./terraform " ,(err,stdout, error)=>{
                        if(err){
                                resp.send(err);
                        }
                        else if(stderr){
                                resp.send(stderr);
                        }
                        else{
                                resp.send(stdout);
                        }

                }) */


        }
        else if(cloudProvider === "azure"){}


    console.log('Received form data:', cloudProvider,workenv,variables );
    console.log(terraformCommand)

})



// WebSocket connection handler
wss.on('connection', (ws) => {
  console.log('Client connected');

  // Handle WebSocket errors
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });

  // Handle WebSocket disconnections
  ws.on('close', () => {
    console.log('Client disconnected');
  });
});


server.listen(2323, ()=>{

console.log("server started on portnumber  2323 ");
})
