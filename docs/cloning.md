# Cloning your repository
So now we need to clone our repository, that may sound like we're gonna do like in Star Wars and create an army but sadly it's just the process of getting your cloud folder onto your computer, you can imagine this as copy pasting a folder from the cloud.

To be able to make a PR we also need to make what's called a branch after cloning, we won't be explaining this as it's require a greater understanding of git though if you're studious [here's a link](https://www.w3schools.com/git/git_branch.asp)

## Cloning on Windows
To clone your files you simply need to open a commandline window, we'll do this by holding the `windows key` and pressing `R`, this will spawn a small little windowin the bottom left with a text input, simply type in `cmd` and press `enter`.
Now, don't be scared by the hackerman window that appeared.
You now have to write or copy in the following command while replacing `YOUR_USERNAME` with you username on github
```bash
git clone https://github.com/YOUR_USERNAME/open-filament-database.git
```
press enter and let it run, when it allows you to write again you then enter the following two lines, first one will be speedy.

**Remember to replace YOUR_BRANCHNAME with what your request provides**
E.g. adding a new red variant to the plain pla of Elegoo would be "RedPlaElegoo

```bash
cd open-filament-database
git checkout -b YOUR_BRANCHNAME
```

Leave open the window and go back follow the rest of the guide

## Cloning on Linux and MacOS
Simply open you terminal and run the following to clone your repository and create a branch for your changes
```bash
git clone https://github.com/YOUR_USERNAME/open-filament-database.git
cd open-filament-database
git checkout -b YOUR_BRANCHNAME
```

Leave open the terminal and go back follow the rest of the guide