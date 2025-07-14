#!/usr/bin/env node

import mlSvmPkg from 'ml-svm';

console.log('mlSvmPkg:', mlSvmPkg);
console.log('typeof mlSvmPkg:', typeof mlSvmPkg);
console.log('mlSvmPkg.default:', mlSvmPkg.default);
console.log('mlSvmPkg.SVM:', mlSvmPkg.SVM);

const SVM = mlSvmPkg.default || mlSvmPkg.SVM || mlSvmPkg;
console.log('SVM:', SVM);
console.log('typeof SVM:', typeof SVM);

try {
    const svm = new SVM();
    console.log('SVM created successfully');
} catch (error) {
    console.error('SVM creation failed:', error.message);
} 