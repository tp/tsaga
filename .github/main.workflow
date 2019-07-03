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
  resolves = ["Build", "Test"]
}

action "Build" {
  uses = "nuxt/actions-yarn@master"
  args = "install && yarn run tsc"
}

action "Test" {
  needs = "Build"
  uses = "nuxt/actions-yarn@master"
  args = "test"
}
