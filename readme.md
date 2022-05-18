To build a docker image, which is what will be pushed to and released on heroku,
(period specifies current directory)
    $ docker build -t magnova:latest .


To run that image locally,
1. Open command prompt as admin
2. If on Windows, install WSL (needed by Docker):
    wsl --install
3. Install Docker from https://docs.docker.com/desktop/windows/install/

To push the latest version to production on heroku:
Delete the previous local Docker image if you made one (otherwise it won't update, strangely), then push using the heroku interface 
    $ docker rmi registry.heroku.com/magnova/web:latest
    (^or use the Docker desktop interface^)
    $ heroku container:login
    $ heroku container:push web
    $ heroku container:release web
