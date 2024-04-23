wget https://releases.hashicorp.com/terraform/1.9.0-alpha20240404/terraform_1.9.0-alpha20240404_linux_amd64.zip
unzip terraform_1.9.0-alpha20240404_linux_amd64.zip
mv terraform /usr/local/bin/

curl -fsSL https://rpm.nodesource.com/setup_21.x | bash -
yum install -y nodejs


yum install git -y 
mkdir haproxy 
cd haproxy
git init
git pull https://github.com/naiduharinadh/HAproxyAutomation.git
npm install 

#replce the public ip
addr=$(curl -s https://ifconfig.me)
sed -i "s/const ip = \".*\"/const ip = \"$addr\"/" server.js

sed -i '16i\export PATH="/root/haproxy/terraform:$PATH" ' /root/.bashrc
source /root/.bashrc

#auto allow my system to login to the system -- ssh key host checking as YES 
export ANSIBLE_SSH_ARGS="-o StrictHostKeyChecking=no"
