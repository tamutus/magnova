### DEVELOPMENT
First, I'll discuss how to get Magnova running locally so you can get developing. Before you start coding, make sure you create a new branch for whatever group of changes you'd like to apply.
To run Magnova locally:
1. First, communicate with the development team that you would like to collaborate on Magnova. Lavra will create database credentials for you, and supply you with the proper environment variables. They will send you a file titled .env
2. Choose a folder on your computer to hold this project. Cloning the repo will automatically make a "magnova" folder within this folder, so you don't need to make a new Magnova folder.
3. Navigate to that folder with your preferred CLI (such as in Visual Studio Code) and run the following command:
        $ git clone https://github.com/tamutus/magnova.git
4. Navigate into the new "magnova" directory, such as with
        $ cd magnova
5. Here you'll need Node installed. If you don't have it, get it from https://nodejs.org/en/download/
6. Now you're in the project's top level directory (TLD). Run:
        $ npm install
7. Here, you'll be stuck until the development team supplies you with an environment file. If the file name ends up something other than ".env", such as "env", then change it back to ".env" exactly.
8. Paste .env into the TLD. As of Sep 4, 2022, it should be sandwiched between .dockerignore and .gitignore
9. Run ONE of the following two commands to run the server
        $ npm run serve
        $ nodemon
# 10. Create a new branch for logically grouped chunks of changes
Once you have confirmed that everything is working, and that your local server is able to retrieve some data from the development database, you are ready to start coding. Create and checkout a new branch for the feature or group of changes you'd like to write. If you have a few little improvements, or a bunch of similar improvements, you can just group those into a branch.
11. a) If you created the branch on github, locally fetch changes from the github remote to detect the new branch.
11. b) Push the new branch to github.
12. On the branch's github page, create a pull request to master. Because Magnova is not currently using Continuous Integration, and we are releasing features as we make them, you don't have to worry *too* much about polluting the master branch. A senior developer (Lavra, for now) will publish the updated master branch with docker. In the future, we will likely create a separate development branch for you to make pull requests to.

### IMPROVE US
If you have experience working on team projects before and think you can improve this workflow, don't hesitate to share them with the team. For us to create great services, we should all be open to new ideas, better infrastructure, and helping each other learn. I know that there is much knowledge I lack, and I'm sure there's even more that I'm not aware exists.

### PRODUCTION
To build a docker image, which is what will be pushed to and released on heroku,
(period specifies current directory)
    $ docker build -t magnova:latest .


To run that image locally,
1. Open command prompt as admin
2. If on Windows, install WSL (needed by Docker):
    wsl --install
3. Install Docker from https://docs.docker.com/desktop/windows/install/

To push the latest version to production on heroku:
Start Docker Desktop
Delete the previous local Docker image if you made one (otherwise it won't update, strangely), then push using the heroku interface 
    $ docker rmi registry.heroku.com/magnova/web:latest
    (^or use the Docker desktop interface^)
    $ heroku container:login
    $ heroku container:push web
    $ heroku container:release web
