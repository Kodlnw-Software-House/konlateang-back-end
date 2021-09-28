// Define variables
def scmVars

// Start Pipeline
pipeline {

  // Configure Jenkins Slave
  agent {
    // Use Kubernetes as dynamic Jenkins Slave
    kubernetes {
      // Kubernetes Manifest File to spin up Pod to do build
      yaml """
apiVersion: v1
kind: Pod
spec:
  containers:
  - name: helm
    image: lachlanevenson/k8s-helm:v3.5.0
    command:
    - cat
    tty: true
  - name: docker
    image: docker:19.03.12-dind
    command:
    - dockerd
    - --host=unix:///var/run/docker.sock
    - --host=tcp://0.0.0.0:2375
    - --storage-driver=overlay2
    tty: true
    securityContext:
      privileged: true
  - name: java-node
    image: timbru31/java-node:11-alpine-jre-14
    command:
    - cat
    tty: true   
    volumeMounts:
    - mountPath: /home/jenkins/dependency-check-data
      name: dependency-check-data
  volumes:
  - name: dependency-check-data
    hostPath:
      path: /tmp/dependency-check-data
"""
    } // End kubernetes
  } // End agent
    environment {
    ENV_NAME = "${BRANCH_NAME == "master" ? "uat" : "${BRANCH_NAME}"}"
    SCANNER_HOME = tool 'konlateang-sonarqube'
    PROJECT_KEY = "konlateang-back-end"
    PROJECT_NAME = "konlateang-back-end"
  }

  // Start Pipeline
  stages {

    // ***** Stage Clone *****
    stage('Clone konlateang-back-end source code') {
      // Steps to run build
      steps {
        // Run in Jenkins Slave container
        container('jnlp') {
          // Use script to run
          script {
            // Git clone repo and checkout branch as we put in parameter
            scmVars = git branch: "${BRANCH_NAME}",
                          credentialsId: 'konlateang-deploy-key',
                          url: 'git@github.com:Kodlnw-Software-House/konlateang-back-end.git'
          } // End script
        } // End container
      } // End steps
    } // End stage

    // ***** Stage Sonarqube *****
    stage('Sonarqube Scanner') {
        steps {
            container('java-node'){
                script {
                    // Authentiocation with https://sonarqube.kodlnw-product.net
                    withSonarQubeEnv('konlateang-sonarqube') {
                        // Run Sonar Scanner
                        sh '''${SCANNER_HOME}/bin/sonar-scanner \
                        -D sonar.projectKey=${PROJECT_KEY} \
                        -D sonar.projectName=${PROJECT_NAME} \
                        -D sonar.projectVersion=${BRANCH_NAME}-${BUILD_NUMBER} \
                        -D sonar.sources=./src
                        '''
                    }//End withSonarQubeEnv

                    // Run Quality Gate
                    timeout(time: 1, unit: 'MINUTES') { 
                        def qg = waitForQualityGate()
                        if (qg.status != 'OK') {
                            error "Pipeline aborted due to quality gate failure: ${qg.status}"
                        }
                    } // End Timeout
                } // End script
            } // End container
        } // End steps
    } // End stage

    // ***** Stage OWASP *****
    stage('OWASP Dependency Check') {
        environment {
          // Override HOME to WORKSPACE
          HOME = "${WORKSPACE}"
          // or override default cache directory (~/.npm)
          NPM_CONFIG_CACHE = "${WORKSPACE}/.npm"
            }
        steps {
            container('java-node') {
                script {
                    // Install application dependency
                    sh ''' npm install --package-lock '''
                    // Start OWASP Dependency Check
                    dependencyCheck(
                        additionalArguments: "--data /home/jenkins/dependency-check-data --out dependency-check-report.xml",
                        odcInstallation: "Dependency-Check"
                    )
                    // Publish report to Jenkins
                    dependencyCheckPublisher(
                        pattern: 'dependency-check-report.xml'
                    )
                    // Remove applocation dependency
                    sh'''rm -rf ./node_modules ./package-lock.json'''
                } // End script
            } // End container
        } // End steps
    } // End stage    
   
    // ***** Stage Build *****
    stage('Build konlateang-back-end Docker Image and push') {
      steps {
        container('docker') {
          script {
            // Do docker login authentication
            docker.withRegistry('https://ghcr.io', 'konlateang-ghcr') {
              // Do docker build and docker push
              docker.build('ghcr.io/kodlnw-software-house/konlateang-back-end:${ENV_NAME}').push()
            } // End docker.withRegistry
          } // End script
        } // End container
      } // End steps
    } // End stage
    
     // ***** Stage Anchore *****
    stage('Anchore Engine') {
      steps {
        container('jnlp') {
          script {
                // dend Docker Image to Anchore Analyzer
                writeFile file: 'anchore_images' , text: "ghcr.io/kodlnw-software-house/konlateang-back-end:${ENV_NAME}"
                anchore name: 'anchore_images' , bailOnFail: false , engineRetries: '10000'
            } // End script
          } // End container
        } // End steps
      } // End stage

    stage('Deploy konlateang-back-end with Helm Chart') {
      steps {
        // Run on Helm container
        container('helm') {
          script {
            // Use kubeconfig from Jenkins Credential
            withKubeConfig([credentialsId: 'gke-k8s-kubeconfig']) {
              // Run Helm upgrade
              sh "helm upgrade -i -f k8s/helm-values/values-konlateang-back-end-${ENV_NAME}.yaml --wait \
                --set extraEnv.COMMIT_ID=${scmVars.GIT_COMMIT} \
              --namespace konlateang-service-${ENV_NAME} konlateang-service-back-end-${ENV_NAME} k8s/helm"
            } // End withKubeConfig
          } // End script
        } // End container
      } // End steps
    } // End stage

  } // End stages
} // End pipeline