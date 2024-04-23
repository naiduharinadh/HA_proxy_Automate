terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}


provider "aws" {
      region = var.region
      access_key = var.accessKey
      secret_key = var.secretKey
}



# Define your security group allowing all traffic
# resource "aws_security_group" "allow_all2" {
#  name        = "firewall-allow-all"
#  description = "Allow all inbound and outbound traffic"

  # Allow all inbound traffic
  #ingress {
 #   from_port   = 0
#    to_port     = 0
   # protocol    = "-1"
  #  cidr_blocks = ["0.0.0.0/0"]
 # }

  # Allow all outbound traffic
#  egress {
#    from_port   = 0
#    to_port     = 0
#    protocol    = "-1"
#    cidr_blocks = ["0.0.0.0/0"]
#  }
#}

resource "aws_key_pair" "my_key_pair" {
  key_name   = "system-key-pair"  # Specify a name for your key pair
  public_key = file("~/.ssh/id_rsa.pub")  # Path to your public key file
}

resource "aws_security_group" "ssh_access" {
  name        = "ssh-access"
  description = "Allow SSH access"
  
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]  # Allow SSH access from anywhere (not recommended for production)
  }
}


resource "aws_instance" "os1"{
     ami = "ami-09ccb67fcbf1d625c"
     key_name      = aws_key_pair.my_key_pair.key_name 
#     instance_type = "t2.micro"

#     instance_type = lookup(var.processore_type , terraform.workspace)

      instance_type = var.workspace_of[terraform.workspace].inst_type

#     security_groups = [aws_security_group.allow_all.name]
      security_groups = [aws_security_group.ssh_access.name]
    
}
resource "null_resource" "add_ssh_key" {
    depends_on = [aws_instance.os1]
     connection{
        type="ssh"
        user = "ec2-user"
        host=aws_instance.os1.public_ip
        private_key = file("~/.ssh/id_rsa")
     }

    provisioner "remote-exec" {
      inline=[
	" sudo sed -i 's/^#PermitRootLogin .*/PermitRootLogin yes/' /etc/ssh/sshd_config " ,
	" sudo sed -i 's/PasswordAuthentication no .*/PasswordAuthentication yes /' /etc/ssh/sshd_config " ,
	" sudo sed -i 's/PermitEmptyPasswords no .*/PermitEmptyPasswords yes/' /etc/ssh/sshd_config",
	" sudo systemctl restart sshd "
        ]
     }

}

output "instance_type"{
       value = aws_instance.os1.instance_type
}

output "publicIP"{
value = aws_instance.os1.public_ip
}


resource "local_file" "os_details" {
  filename = "${path.module}/os_details.txt"
  content  = aws_instance.os1.public_ip
}
