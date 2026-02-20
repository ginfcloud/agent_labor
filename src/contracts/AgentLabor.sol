// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract AgentLabor is Ownable, ReentrancyGuard {
    uint256 public constant PLATFORM_FEE_PERCENT = 3;
    address public platformWallet;

    enum JobStatus { Open, Cancelled, Done }

    struct Job {
        uint256 jobId;
        address requester;
        address doneBy;
        uint256 reward;
        JobStatus status;
    }

    mapping(uint256 => Job) public jobs;
    mapping(uint256 => bool) public jobRegistered;
    uint256 public jobCount;

    event JobCreated(uint256 indexed jobId, address indexed requester, uint256 reward);
    event JobCancelled(uint256 indexed jobId, address indexed requester);
    event JobCompleted(uint256 indexed jobId, address indexed doneBy);
    event RewardClaimed(uint256 indexed jobId, address indexed claimer, uint256 amount, uint256 fee);
    event PlatformWalletUpdated(address indexed oldWallet, address indexed newWallet);

    modifier onlyJobRequester(uint256 _jobId) {
        require(jobs[_jobId].requester == msg.sender, "Not job requester");
        _;
    }

    modifier jobExists(uint256 _jobId) {
        require(jobRegistered[_jobId], "Job does not exist");
        _;
    }

    constructor(address _platformWallet) Ownable(msg.sender) {
        require(_platformWallet != address(0), "Invalid platform wallet");
        platformWallet = _platformWallet;
    }

    function setPlatformWallet(address _newWallet) external onlyOwner {
        require(_newWallet != address(0), "Invalid platform wallet");
        address oldWallet = platformWallet;
        platformWallet = _newWallet;
        emit PlatformWalletUpdated(oldWallet, _newWallet);
    }

    function createJob(uint256 _jobId) external payable nonReentrant returns (uint256) {
        require(msg.value > 0, "Reward must be greater than 0");
        require(_jobId > 0, "Job ID must be greater than 0");
        require(!jobRegistered[_jobId], "Job ID already exists");

        jobCount++;
        jobRegistered[_jobId] = true;

        jobs[_jobId] = Job({
            jobId: _jobId,
            requester: msg.sender,
            doneBy: address(0),
            reward: msg.value,
            status: JobStatus.Open
        });

        emit JobCreated(_jobId, msg.sender, msg.value);
        return _jobId;
    }

    function cancelJob(uint256 _jobId) 
        external 
        nonReentrant 
        jobExists(_jobId) 
        onlyJobRequester(_jobId) 
    {
        Job storage job = jobs[_jobId];
        require(job.status == JobStatus.Open, "Job not open");
        require(job.doneBy == address(0), "Job already assigned");

        job.status = JobStatus.Cancelled;

        (bool success, ) = payable(msg.sender).call{value: job.reward}("");
        require(success, "Refund failed");

        emit JobCancelled(_jobId, msg.sender);
    }

    function setJobDone(uint256 _jobId, address _doneBy) 
        external 
        onlyOwner 
        jobExists(_jobId) 
    {
        Job storage job = jobs[_jobId];
        require(job.status == JobStatus.Open, "Job not open");
        require(_doneBy != address(0), "Invalid doneBy address");

        job.doneBy = _doneBy;
        job.status = JobStatus.Done;

        emit JobCompleted(_jobId, _doneBy);
    }

    function claimReward(uint256 _jobId) 
        external 
        nonReentrant 
        jobExists(_jobId) 
    {
        Job storage job = jobs[_jobId];
        require(job.status == JobStatus.Done, "Job not done");
        require(job.doneBy == msg.sender, "Not authorized to claim");
        require(job.reward > 0, "Already claimed");

        uint256 reward = job.reward;
        uint256 fee = (reward * PLATFORM_FEE_PERCENT) / 100;
        uint256 payout = reward - fee;

        job.reward = 0;

        (bool feeSuccess, ) = payable(platformWallet).call{value: fee}("");
        require(feeSuccess, "Fee transfer failed");

        (bool payoutSuccess, ) = payable(msg.sender).call{value: payout}("");
        require(payoutSuccess, "Payout transfer failed");

        emit RewardClaimed(_jobId, msg.sender, payout, fee);
    }

    function getJob(uint256 _jobId) external view jobExists(_jobId) returns (Job memory) {
        return jobs[_jobId];
    }

    function getJobsByRequester(address _requester, uint256 _offset, uint256 _limit) 
        external 
        view 
        returns (Job[] memory, uint256 total) 
    {
        uint256 count = 0;
        for (uint256 i = 1; i <= jobCount; i++) {
            if (jobs[i].requester == _requester) count++;
        }

        if (_offset >= count) {
            return (new Job[](0), count);
        }

        uint256 end = _offset + _limit > count ? count : _offset + _limit;
        Job[] memory result = new Job[](end - _offset);

        uint256 idx = 0;
        uint256 found = 0;
        for (uint256 i = 1; i <= jobCount && idx < result.length; i++) {
            if (jobs[i].requester == _requester) {
                if (found >= _offset) {
                    result[idx] = jobs[i];
                    idx++;
                }
                found++;
            }
        }

        return (result, count);
    }

    function getOpenJobs(uint256 _offset, uint256 _limit) 
        external 
        view 
        returns (Job[] memory, uint256 total) 
    {
        uint256 count = 0;
        for (uint256 i = 1; i <= jobCount; i++) {
            if (jobs[i].status == JobStatus.Open) count++;
        }

        if (_offset >= count) {
            return (new Job[](0), count);
        }

        uint256 end = _offset + _limit > count ? count : _offset + _limit;
        Job[] memory result = new Job[](end - _offset);

        uint256 idx = 0;
        uint256 found = 0;
        for (uint256 i = 1; i <= jobCount && idx < result.length; i++) {
            if (jobs[i].status == JobStatus.Open) {
                if (found >= _offset) {
                    result[idx] = jobs[i];
                    idx++;
                }
                found++;
            }
        }

        return (result, count);
    }

    receive() external payable {
        revert("Direct payments not accepted");
    }
}
