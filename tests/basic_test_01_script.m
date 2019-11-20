%% Load state space system
load basic_test_01.mat

%% Eigenvalues
eig(sys)

%% Linear simulation: step
figure; step(sys);