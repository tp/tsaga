workflow "publish on release" {
  on = "release"
  resolves = ["publish"]
}

action "publish" {
  uses = "actions/npm@master"
  args = "publish"
  secrets = ["NPM_AUTH_TOKEN"]
}

workflow "build and test" {
  on = "push"
  resolves = ["test", "lint"]
}

action "build" {
  uses = "actions/npm@master"
  args = "ci"
}

action "test" {
  needs = "build"
  uses = "actions/npm@master"
  args = "t"
}

action "lint" {
  needs = "build"
  uses = "actions/npm@master"
  args = "run lint"
}
