const { DefaultArtifactClient } = require("@actions/artifact");
const fs = require('fs');
const path = require('path');
const core = require('@actions/core');
const run = require("@actions/artifact"); 

async function main(github, context, artifactName,artifactPath,retentionDays,compressionLevel,ifNoFilesFound, includeHiddenFiles) {
  console.log("inside main");

  const artifactClient = new DefaultArtifactClient();
  try {
    await uploadArtifact(artifactClient, artifactName, artifactPath,retentionDays,compressionLevel,ifNoFilesFound,includeHiddenFiles);
  } catch (error) {
    core.setFailed(error.message);
  }
}

function isFile(inputPath) {
  const stats = fs.lstatSync(inputPath);
  return stats.isFile();
}

async function uploadArtifact(artifactClient, artifactName, artifactPath,retentionDays,compressionLevel,ifNoFilesFound,includeHiddenFiles) {

  console.log("upload-artifact inside");

  const paths = artifactPath.split(';'); // Split by `;`
  let filesToUpload = [];

  for (const path of paths) {

     if (!fs.existsSync(path)) {
         continue;
     }
    
    if (isFile(path)) {
          filesToUpload = filesToUpload.concat(path); // Accumulate file
    }
    else {      
      const files = await populateFilesWithFullPath(path.trim(),includeHiddenFiles); // Get files for each path
      console.log("After populate")
      console.log(path)
      filesToUpload = filesToUpload.concat(files); // Accumulate files
      if (hasGitFolderWithGitHubRunnerToken(artifactPath))
        throw new Error(`Found GITHUB_TOKEN in artifact, under path ${foundPath}`);
    }
  }

  if (filesToUpload.length == 0) {

     switch (ifNoFilesFound) {
      case "warn": {
        core.warning(
          `No files were found with the provided path: ${artifactPath}. No artifacts will be uploaded.`
        )
        break
      }
      case "error": {
        core.setFailed(
          `No files were found with the provided path: ${artifactPath}. No artifacts will be uploaded.`
        )
        break
      }
      case "ignore": {
        core.info(
          `No files were found with the provided path: ${artifactPath}. No artifacts will be uploaded.`
        )
        break
      }
     }

    return
  }
             
  await artifactClient.uploadArtifact(
    artifactName,
    filesToUpload,
    process.env.GITHUB_WORKSPACE,
    { retentionDays: 10 } // Optional: Set retention days
  );
}


function findGitFolder(startPath) {
    if (!fs.existsSync(startPath)) {
        console.log("Start path does not exist.");
        return null;
    }

    const files = fs.readdirSync(startPath);

    for (let i = 0; i < files.length; i++) {
        const filePath = path.join(startPath, files[i]);

        if (files[i] === '.git' && fs.statSync(filePath).isDirectory()) {
            return filePath;
        }

        if (fs.statSync(filePath).isDirectory()) {
            const result = findGitFolder(filePath);
            if (result) {
                return result;
            }
        }
    }

    return null;
}

function hasGitFolderWithGitHubRunnerToken(pathToCheck) {
  const fs = require('fs');
  const path = require('path');

  const gitDir = findGitFolder(pathToCheck, '.git');
  const configFile = path.join(gitDir, 'config');
  const regex = new RegExp('eC1hY2Nlc3MtdG9rZW46Z2hz', 'i');

  try {
    if (fs.existsSync(gitDir) && fs.existsSync(configFile)) {
      const configContent = fs.readFileSync(configFile, 'utf-8');
      if (regex.test(configContent)) {      
          return configFile;
      }
    }
    } catch (error) {
      console.error('Error checking Git config:', error);
      return null;
    }
}

async function populateFilesWithFullPath(rootPath,includeHiddenFiles) {
  console.log("populateFilesWithFullPath 1")
  const fs = require('fs').promises; // Use promises for cleaner async/await usage
  const path = require('path');
  const files = [];

  const dirEntries = await fs.readdir(rootPath);
  for (const fileName of dirEntries) {
    const filePath = path.join(rootPath, fileName);

    const stats = await fs.stat(filePath);
    if (stats.isFile()) {
      console.log("before calling isHiddenFile")
      if (isHiddenFile(filePath)){
         console.log("after hfile")
        if (includeHiddenFiles){
          files.push(filePath);
        }
      }
      else {
        files.push(filePath);
      }
    } else if (stats.isDirectory()) {
      // Recursively collect files from subdirectories
      files.push(...(await populateFilesWithFullPath(filePath,includeHiddenFiles)));
    }
  }

  return files;
}

function isHiddenFile(filePath) {
  console.log("isHiddenFile")
  console.log(filePath)
  const path = require('path');
  return path.basename(filePath).startsWith('.');
}

module.exports = function ({ github, context , artifactName,artifactPath,retentionDays,compressionLevel,ifNoFilesFound, includeHiddenFiles }) { 
   main(github, context, artifactName,artifactPath,retentionDays,compressionLevel, ifNoFilesFound, includeHiddenFiles);
}
