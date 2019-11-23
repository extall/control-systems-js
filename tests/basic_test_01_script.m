%% Load state space system
load basic_test_01.mat

%% Eigenvalues
eig(sys)

%% Linear simulation: step
t = 0:0.1:1;
figure; y = step(sys,t);