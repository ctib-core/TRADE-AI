// Simple in-memory job queue for async ML tasks
import { v4 as uuidv4 } from 'uuid';

export const jobQueue = [];
const jobResults = {};
const jobStatus = {};

function addJob(type, data) {
    const id = uuidv4();
    const job = { id, type, data, status: 'pending', createdAt: new Date().toISOString() };
    jobQueue.push(job);
    jobStatus[id] = 'pending';
    console.log(`Job ${id} added to queue (type: ${type})`);
    return id;
}

function getJobStatus(id) {
    return jobStatus[id] || 'not_found';
}

function getJobResult(id) {
    return jobResults[id] || null;
}

function getJob(id) {
    return jobQueue.find(job => job.id === id) || null;
}

function getQueueStats() {
    return {
        total: jobQueue.length,
        pending: jobQueue.filter(job => job.status === 'pending').length,
        inProgress: Object.values(jobStatus).filter(status => status === 'in_progress').length,
        completed: Object.values(jobStatus).filter(status => status === 'completed').length,
        failed: Object.values(jobStatus).filter(status => status === 'failed').length
    };
}

async function processJobs(workerFn) {
    if (processJobs.processing) {
        console.log('Job processing already in progress');
        return;
    }
    
    processJobs.processing = true;
    console.log('Starting job processing...');
    
    async function processNext() {
        if (jobQueue.length === 0) {
            processJobs.processing = false;
            console.log('Job queue empty, stopping processing');
            return;
        }
        
        const job = jobQueue.shift();
        job.status = 'in_progress';
        jobStatus[job.id] = 'in_progress';
        job.startedAt = new Date().toISOString();
        
        console.log(`Processing job ${job.id} (type: ${job.type})`);
        
        try {
            const result = await workerFn(job.type, job.data);
            jobResults[job.id] = result;
            jobStatus[job.id] = 'completed';
            job.status = 'completed';
            job.completedAt = new Date().toISOString();
            console.log(`Job ${job.id} completed successfully`);
        } catch (err) {
            console.error(`Job ${job.id} failed:`, err.message);
            jobResults[job.id] = { 
                error: err.message,
                stack: err.stack,
                failedAt: new Date().toISOString()
            };
            jobStatus[job.id] = 'failed';
            job.status = 'failed';
            job.failedAt = new Date().toISOString();
        }
        
        // Process next job
        setImmediate(processNext);
    }
    
    setImmediate(processNext);
}

function clearCompletedJobs() {
    const completedIds = Object.keys(jobStatus).filter(id => 
        jobStatus[id] === 'completed' || jobStatus[id] === 'failed'
    );
    
    completedIds.forEach(id => {
        delete jobResults[id];
        delete jobStatus[id];
    });
    
    console.log(`Cleared ${completedIds.length} completed/failed jobs`);
    return completedIds.length;
}

function cancelJob(id) {
    const jobIndex = jobQueue.findIndex(job => job.id === id);
    if (jobIndex === -1) {
        return false; // Job not found or already processing
    }
    
    jobQueue.splice(jobIndex, 1);
    jobStatus[id] = 'cancelled';
    jobResults[id] = { error: 'Job cancelled' };
    console.log(`Job ${id} cancelled`);
    return true;
}

// ES module exports
export {
    addJob,
    getJobStatus,
    getJobResult,
    getJob,
    getQueueStats,
    processJobs,
    clearCompletedJobs,
    cancelJob
};

export default {
    addJob,
    getJobStatus,
    getJobResult,
    getJob,
    getQueueStats,
    processJobs,
    clearCompletedJobs,
    cancelJob,
    jobQueue
};