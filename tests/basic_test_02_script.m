%% Load state space system
load basic_test_02.mat

%% Eigenvalues
eig(sys1)

%% Linear simulation: step
figure; step(sys1);