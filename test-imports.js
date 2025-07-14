#!/usr/bin/env node

console.log('Testing ML library imports...\n');

// Test ml-random-forest
try {
    const mlRfPkg = await import('ml-random-forest');
    console.log('✅ ml-random-forest imported successfully');
    console.log('RandomForestRegression:', typeof mlRfPkg.RandomForestRegression);
} catch (error) {
    console.error('❌ ml-random-forest import failed:', error.message);
}

// Test ml-svm
try {
    const mlSvmPkg = await import('ml-svm');
    console.log('✅ ml-svm imported successfully');
    console.log('SVM:', typeof mlSvmPkg.default);
} catch (error) {
    console.error('❌ ml-svm import failed:', error.message);
}

// Test ml-pca
try {
    const mlPcaPkg = await import('ml-pca');
    console.log('✅ ml-pca imported successfully');
    console.log('PCA:', typeof mlPcaPkg.default);
} catch (error) {
    console.error('❌ ml-pca import failed:', error.message);
}

// Test ml-kmeans
try {
    const mlKmeansPkg = await import('ml-kmeans');
    console.log('✅ ml-kmeans imported successfully');
    console.log('KMeans:', typeof mlKmeansPkg.default);
} catch (error) {
    console.error('❌ ml-kmeans import failed:', error.message);
}

// Test ml-matrix
try {
    const { Matrix } = await import('ml-matrix');
    console.log('✅ ml-matrix imported successfully');
    console.log('Matrix:', typeof Matrix);
} catch (error) {
    console.error('❌ ml-matrix import failed:', error.message);
}

console.log('\nImport test completed!'); 