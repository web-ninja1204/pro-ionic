/**
 * Deploy script adopted from https://github.com/sindresorhus/np
 * MIT License (c) Sindre Sorhus (sindresorhus.com)
 */
const tc = require('turbocolor');
const execa = require('execa');
const Listr = require('listr');
const path = require('path');
const octokit = require('@octokit/rest')()
const common = require('./common');
const fs = require('fs-extra');


async function main() {
  try {
    const dryRun = process.argv.indexOf('--dry-run') > -1;

    if (!process.env.GH_TOKEN) {
      throw new Error('env.GH_TOKEN is undefined');
    }

    checkProductionRelease();

    const tasks = [];
    const { version } = common.readPkg('core');
    const changelog = findChangelog();

    // repo must be clean
    common.checkGit(tasks);

    const { tag, confirm } = await common.askTag();

    if (!confirm) {
      return;
    }

    if(!dryRun) {
      // publish each package in NPM
      common.publishPackages(tasks, common.packages, version, tag);

      // push tag to git remote
      publishGit(tasks, version, changelog);
    }

    const listr = new Listr(tasks);
    await listr.run();

    // Dry run doesn't publish to npm or git
    if (dryRun) {
      console.log(`
        \n${tc.yellow('Did not publish. Remove the "--dry-run" flag to publish:')}\n${tc.green(version)} to ${tc.cyan(tag)}\n
      `);
    } else {
      console.log(`\nionic ${version} published to ${tag}!! 🎉\n`);
    }

  } catch (err) {
    console.log('\n', tc.red(err), '\n');
    process.exit(1);
  }
}

function checkProductionRelease() {
  const corePath = common.projectPath('core');
  const hasEsm = fs.existsSync(path.join(corePath, 'dist', 'esm'));
  const hasEsmEs5 = fs.existsSync(path.join(corePath, 'dist', 'esm-es5'));
  const hasCjs = fs.existsSync(path.join(corePath, 'dist', 'cjs'));
  if (!hasEsm || !hasEsmEs5 || !hasCjs) {
    throw new Error('core build is not a production build');
  }
}

function publishGit(tasks, version, changelog) {
  const tag = `v${version}`;

  tasks.push(
    {
      title: `Tag latest commit ${tc.dim(`(${tag})`)}`,
      task: () => execa('git', ['tag', `${tag}`], { cwd: common.rootDir })
    },
    {
      title: 'Push branches to remote',
      task: () => execa('git', ['push'], { cwd: common.rootDir })
    },
    {
      title: 'Push tags to remove',
      task: () => execa('git', ['push', '--follow-tags'], { cwd: common.rootDir })
    },
    {
      title: 'Publish Github release',
      task: () => publishGithub(version, tag, changelog)
    }
  );
}

function findChangelog() {
  const lines = fs.readFileSync('CHANGELOG.md', 'utf-8').toString().split('\n');
  let start = -1;
  let end = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('# [')) {
      if (start === -1) {
        start = i + 1;
      } else {
        end = i - 1;
        break;
      }
    }
  }

  if(start === -1 || end === -1) {
    throw new Error('changelog diff was not found');
  }
  return lines.slice(start, end).join('\n').trim();
}

async function publishGithub(version, tag, changelog) {
  octokit.authenticate({
    type: 'oauth',
    token: process.env.GH_TOKEN
  });

  let branch = await execa.stdout('git', ['symbolic-ref', '--short', 'HEAD']);

  if (!branch) {
    branch = 'master';
  }

  await octokit.repos.createRelease({
    owner: 'ionic-team',
    repo: 'ionic',
    target_commitish: branch,
    tag_name: tag,
    name: version,
    body: changelog,
  });
}

main();
